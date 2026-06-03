import fs from 'fs/promises';
import path from 'path';

const GRAPH_API = 'https://graph.facebook.com/v21.0';

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

/**
 * Obtiene URL temporal de descarga desde media_id (webhook WhatsApp).
 */
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

export type InboundImageDownloadInput = {
  waId: string;
  accessToken: string;
  existingUrl?: string;
  rawMessage?: Record<string, unknown>;
};

/**
 * Descarga imagen entrante de Meta y la guarda en public/inbound-media.
 * Devuelve URL pública absoluta para el CRM (sin lookaside).
 */
export async function downloadInboundImageToPublicUrl(
  input: InboundImageDownloadInput
): Promise<string | null> {
  const { waId, accessToken, existingUrl, rawMessage } = input;

  if (!accessToken?.trim()) {
    console.warn('[whatsapp-media] meta_access_token vacío — no se puede descargar media');
    return null;
  }

  const publicBase = resolveRomaApiPublicBase();
  if (!publicBase) {
    console.error(
      '[whatsapp-media] ROMA_API_PUBLIC_URL no definida en .env.local — debe ser el ngrok del puerto 3000 (roma-api), NO el del CRM (8000). Ej: https://tu-tunel-3000.ngrok-free.dev'
    );
    return null;
  }

  let downloadUrl = existingUrl?.trim() || '';

  const rawImage = rawMessage?.image as { id?: string; link?: string; url?: string } | undefined;
  const mediaId = rawImage?.id;

  if (mediaId && (!downloadUrl || !isMetaHostedMediaUrl(downloadUrl))) {
    const fromGraph = await fetchMediaUrlFromGraph(mediaId, accessToken);
    if (fromGraph) {
      downloadUrl = fromGraph;
    }
  }

  if (!downloadUrl && rawImage?.link) {
    downloadUrl = rawImage.link;
  }
  if (!downloadUrl && rawImage?.url) {
    downloadUrl = rawImage.url;
  }

  if (!downloadUrl) {
    return null;
  }

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'roma-api/1.0',
    };
    if (isMetaHostedMediaUrl(downloadUrl) || mediaId) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    console.log('[whatsapp-media] Descargando bytes', {
      waId,
      fromMeta: isMetaHostedMediaUrl(downloadUrl),
    });

    const res = await fetch(downloadUrl, { headers });
    if (!res.ok) {
      const bodyPreview = (await res.text()).slice(0, 200);
      console.warn('[whatsapp-media] Download failed', {
        waId,
        status: res.status,
        bodyPreview,
      });
      return null;
    }

    const mime = res.headers.get('content-type') ?? 'image/jpeg';
    let ext = 'jpg';
    if (mime.includes('png')) ext = 'png';
    else if (mime.includes('webp')) ext = 'webp';

    const safeId = waId.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
    const filename = `${safeId}_${Date.now()}.${ext}`;
    const dir = path.join(process.cwd(), 'public', 'inbound-media');
    await fs.mkdir(dir, { recursive: true });
    const buffer = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(path.join(dir, filename), buffer);

    const publicUrl = `${publicBase}/api/media/file/${filename}`;
    console.log('[whatsapp-media] Imagen guardada para CRM', { waId, publicUrl, filename });
    return publicUrl;
  } catch (err) {
    console.error('[whatsapp-media] Download error', err);
    return null;
  }
}

/**
 * Si es mensaje con imagen, reemplaza lookaside por URL pública de roma-api.
 */
export async function enrichInboundEventImage(
  event: {
    message_type?: string;
    image_url?: string;
    wa_id: string;
    raw?: unknown;
  },
  accessToken: string
): Promise<string | undefined> {
  if (event.message_type !== 'image') {
    return event.image_url;
  }

  console.log('[whatsapp-media] enrichInboundEventImage', {
    waId: event.wa_id,
    incoming: event.image_url?.slice(0, 80),
    publicBase: resolveRomaApiPublicBase() || '(vacío)',
  });

  const rawMessage =
    event.raw && typeof event.raw === 'object'
      ? (event.raw as Record<string, unknown>)
      : undefined;

  const publicUrl = await downloadInboundImageToPublicUrl({
    waId: event.wa_id,
    accessToken,
    existingUrl: event.image_url,
    rawMessage,
  });

  if (!publicUrl || isMetaHostedMediaUrl(publicUrl)) {
    console.warn('[whatsapp-media] No se reemplazó lookaside — el CRM seguirá sin match visual', {
      waId: event.wa_id,
      result: publicUrl?.slice(0, 80) ?? null,
    });
  }

  return publicUrl ?? event.image_url;
}
