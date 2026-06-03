import { NextResponse } from 'next/server';
import { resolveRomaApiPublicBase } from '@/lib/whatsapp-media-download';

/** Comprueba que esta instancia tiene el pipeline de fotos (GET desde navegador o CRM). */
export async function GET() {
  return NextResponse.json({
    ok: true,
    media_pipeline_version: 3,
    roma_api_public_url: resolveRomaApiPublicBase() || null,
    has_laravel_sync: Boolean(process.env.LARAVEL_MESSAGES_URL),
  });
}
