import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyRomaSyncToken } from '@/lib/whatsapp-auth';
import {
  downloadInboundMediaToPublicUrl,
  InboundMediaKind,
  resolveRomaApiPublicBase,
} from '@/lib/whatsapp-media-download';

export async function POST(request: Request) {
  const auth = verifyRomaSyncToken(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  let body: {
    wa_id?: string;
    media_kind?: string;
    image_url?: string;
    raw?: Record<string, unknown>;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const waId = body.wa_id?.trim();
  if (!waId) {
    return NextResponse.json({ error: 'wa_id required' }, { status: 400 });
  }

  const raw = body.raw;
  const rawType = typeof raw?.type === 'string' ? raw.type : '';
  const mediaKind = (body.media_kind || (rawType === 'voice' ? 'audio' : rawType) || 'image') as InboundMediaKind;

  if (!['image', 'audio', 'video', 'sticker', 'document'].includes(mediaKind)) {
    return NextResponse.json({ error: 'invalid media_kind' }, { status: 422 });
  }

  const { data: settings } = await supabaseAdmin
    .from('app_settings')
    .select('meta_access_token')
    .eq('id', 1)
    .single();

  const accessToken = settings?.meta_access_token as string | undefined;
  if (!accessToken?.trim()) {
    return NextResponse.json(
      { ok: false, error: 'meta_access_token missing in app_settings' },
      { status: 500 }
    );
  }

  const publicBase = resolveRomaApiPublicBase();
  if (!publicBase) {
    return NextResponse.json(
      { ok: false, error: 'ROMA_API_PUBLIC_URL not configured on roma-api' },
      { status: 500 }
    );
  }

  console.log('[media/resolve-inbound] CRM solicitó descarga', { waId, mediaKind, publicBase });

  const result = await downloadInboundMediaToPublicUrl({
    waId,
    accessToken,
    mediaKind,
    rawMessage: raw,
  });

  if (!result?.url || result.url.includes('lookaside.fbsbx.com')) {
    return NextResponse.json(
      { ok: false, public_url: null, error: 'download_failed' },
      { status: 422 }
    );
  }

  return NextResponse.json({
    ok: true,
    public_url: result.url,
    mime_type: result.mime,
    filename: result.filename,
  });
}
