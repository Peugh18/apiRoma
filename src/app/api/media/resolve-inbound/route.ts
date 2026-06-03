import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyRomaSyncToken } from '@/lib/whatsapp-auth';
import {
  downloadInboundImageToPublicUrl,
  resolveRomaApiPublicBase,
} from '@/lib/whatsapp-media-download';

/**
 * CRM llama aquí si el webhook dejó lookaside (roma-api viejo o enrich falló).
 */
export async function POST(request: Request) {
  const auth = verifyRomaSyncToken(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  let body: {
    wa_id?: string;
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
      {
        ok: false,
        error: 'ROMA_API_PUBLIC_URL not configured on roma-api',
      },
      { status: 500 }
    );
  }

  console.log('[media/resolve-inbound] CRM solicitó descarga', { waId, publicBase });

  const publicUrl = await downloadInboundImageToPublicUrl({
    waId,
    accessToken,
    existingUrl: body.image_url,
    rawMessage: body.raw,
  });

  if (!publicUrl || publicUrl.includes('lookaside.fbsbx.com')) {
    return NextResponse.json(
      {
        ok: false,
        public_url: null,
        error: 'download_failed',
      },
      { status: 422 }
    );
  }

  return NextResponse.json({ ok: true, public_url: publicUrl });
}
