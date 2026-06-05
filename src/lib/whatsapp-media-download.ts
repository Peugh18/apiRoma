import fs from 'fs/promises';
import path from 'path';

const GRAPH_API = 'https://graph.facebook.com/v21.0';

export type InboundMediaKind = 'image' | 'audio' | 'video' | 'sticker' | 'document';

export function resolveRomaApiPublicBase(): string {
  return (
    process.env.ROMA_API_PUBLIC_URL?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_ROMA_API_PUBLIC_URL?.replace(/\/$/, '') ||
    ''
  );
}

export function isMetaHostedMediaUrl(url: string): boolean {
  return (
    url.includes('lookaside.fbsbx.com') ||
    url.includes('graph.facebook.com') ||
    url.includes('fbcdn.net')
  );
}

export async function fetchMediaUrlFromGraph(
  mediaId: string,
  accessToken: string
): Promise<string | null> {
  try {
    const res = await fetch(`${GRAPH_API}/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) {
      console.warn('[whatsapp-media] Graph media metadata failed', {
        mediaId,
        status: res.status,
        error: data?.error?.message,
      });
      return null;
    }
    return typeof data.url === 'string' ? data.url : null;
  } catch (err) {
    console.error('[whatsapp-media] Graph media metadata error', err);
    return null;
  }
}

type MediaBlock = {
  id?: string;
  link?: string;
  url?: string;
  mime_type?: string;
  sha256?: string;
  caption?: string;
  filename?: string;
};

export function mediaBlockFromRaw(
  rawMessage: Record<string, unknown> | undefined,
  mediaKind: InboundMediaKind
): MediaBlock | undefined {
  const block = rawMessage?.[mediaKind];
  if (block && typeof block === 'object') {
    return block as MediaBlock;
  }
  return undefined;
}

export function extensionFromMime(mime: string, mediaKind: InboundMediaKind): string {
  const normalized = mime.split(';')[0].trim().toLowerCase();

  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'audio/ogg': 'ogg',
    'audio/opus': 'ogg',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/aac': 'aac',
    'video/mp4': 'mp4',
    'video/3gpp': '3gp',
    'application/pdf': 'pdf',
    'application/octet-stream': mediaKind === 'sticker' ? 'webp' : 'bin',
  };

  return map[normalized] ?? (mediaKind === 'sticker' ? 'webp' : 'bin');
}

export type InboundMediaDownloadInput = {
  waId: string;
  accessToken: string;
  mediaKind: InboundMediaKind;
  rawMessage?: Record<string, unknown>;
};

export type InboundMediaDownloadResult = {
  url: string;
  mime: string;
  filename: string;
};

/**
 * Descarga media entrante de Meta y la guarda en public/inbound-media.
 */
export async function downloadInboundMediaToPublicUrl(
  input: InboundMediaDownloadInput
): Promise<InboundMediaDownloadResult | null> {
  const { waId, accessToken, mediaKind, rawMessage } = input;

  if (!accessToken?.trim()) {
    console.warn('[whatsapp-media] meta_access_token vacío — no se puede descargar media');
    return null;
  }

  const publicBase = resolveRomaApiPublicBase();
  if (!publicBase) {
    console.error(
      '[whatsapp-media] ROMA_API_PUBLIC_URL no definida — ngrok del puerto 3000 (roma-api)'
    );
    return null;
  }

  const block = mediaBlockFromRaw(rawMessage, mediaKind);
  const mediaId = block?.id;
  let downloadUrl = block?.link?.trim() || block?.url?.trim() || '';

  if (mediaId && (!downloadUrl || isMetaHostedMediaUrl(downloadUrl))) {
    const fromGraph = await fetchMediaUrlFromGraph(mediaId, accessToken);
    if (fromGraph) {
      downloadUrl = fromGraph;
    }
  }

  if (!downloadUrl) {
    console.warn('[whatsapp-media] Sin URL de descarga', { waId, mediaKind, mediaId });
    return null;
  }

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'roma-api/1.0',
    };
    if (isMetaHostedMediaUrl(downloadUrl) || mediaId) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    console.log('[whatsapp-media] Descargando bytes', { waId, mediaKind, fromMeta: isMetaHostedMediaUrl(downloadUrl) });

    const res = await fetch(downloadUrl, { headers });
    if (!res.ok) {
      const bodyPreview = (await res.text()).slice(0, 200);
      console.warn('[whatsapp-media] Download failed', { waId, mediaKind, status: res.status, bodyPreview });
      return null;
    }

    const mime =
      res.headers.get('content-type')?.split(';')[0].trim() ||
      block?.mime_type ||
      (mediaKind === 'sticker' ? 'image/webp' : 'application/octet-stream');

    const ext = extensionFromMime(mime, mediaKind);
    const safeId = waId.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
    const filename = `${safeId}_${mediaKind}_${Date.now()}.${ext}`;
    const dir = path.join(process.cwd(), 'public', 'inbound-media');
    await fs.mkdir(dir, { recursive: true });
    const buffer = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(path.join(dir, filename), buffer);

    const publicUrl = `${publicBase}/api/media/file/${filename}`;
    console.log('[whatsapp-media] Media guardada para CRM', { waId, mediaKind, publicUrl, mime });

    return { url: publicUrl, mime, filename };
  } catch (err) {
    console.error('[whatsapp-media] Download error', { waId, mediaKind, err });
    return null;
  }
}

/** @deprecated use downloadInboundMediaToPublicUrl */
export type InboundImageDownloadInput = {
  waId: string;
  accessToken: string;
  existingUrl?: string;
  rawMessage?: Record<string, unknown>;
};

export async function downloadInboundImageToPublicUrl(
  input: InboundImageDownloadInput
): Promise<string | null> {
  const result = await downloadInboundMediaToPublicUrl({
    waId: input.waId,
    accessToken: input.accessToken,
    mediaKind: 'image',
    rawMessage: input.rawMessage,
  });
  return result?.url ?? null;
}

const DOWNLOADABLE_MEDIA: InboundMediaKind[] = ['image', 'audio', 'video', 'sticker', 'document'];

export function isDownloadableInboundMedia(messageType?: string): messageType is InboundMediaKind {
  return DOWNLOADABLE_MEDIA.includes(messageType as InboundMediaKind);
}

export async function enrichInboundEventMedia(
  event: {
    message_type?: string;
    image_url?: string;
    media_url?: string;
    mime_type?: string;
    wa_id: string;
    raw?: unknown;
  },
  accessToken: string
): Promise<{ url?: string; mime?: string }> {
  const mediaKind = event.message_type;
  if (!isDownloadableInboundMedia(mediaKind)) {
    return { url: event.media_url ?? event.image_url, mime: event.mime_type };
  }

  const rawMessage =
    event.raw && typeof event.raw === 'object' ? (event.raw as Record<string, unknown>) : undefined;

  const result = await downloadInboundMediaToPublicUrl({
    waId: event.wa_id,
    accessToken,
    mediaKind,
    rawMessage,
  });

  if (!result) {
    return { url: event.media_url ?? event.image_url, mime: event.mime_type };
  }

  return { url: result.url, mime: result.mime };
}

/** Compat: solo imágenes */
export async function enrichInboundEventImage(
  event: {
    message_type?: string;
    image_url?: string;
    wa_id: string;
    raw?: unknown;
  },
  accessToken: string
): Promise<string | undefined> {
  const enriched = await enrichInboundEventMedia(event, accessToken);
  return enriched.url ?? event.image_url;
}

export function mimeFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    ogg: 'audio/ogg',
    mp3: 'audio/mpeg',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
    mp4: 'video/mp4',
    '3gp': 'video/3gpp',
    pdf: 'application/pdf',
    bin: 'application/octet-stream',
  };
  return map[ext ?? ''] ?? 'application/octet-stream';
}
