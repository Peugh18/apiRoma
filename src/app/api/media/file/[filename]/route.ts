import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

/**
 * Sirve fotos guardadas en public/inbound-media (Next no siempre expone archivos runtime vía /public).
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string }> }
) {
  const { filename } = await context.params;
  const safe = path.basename(filename);
  if (!safe || safe !== filename) {
    return NextResponse.json({ error: 'invalid filename' }, { status: 400 });
  }

  const filePath = path.join(process.cwd(), 'public', 'inbound-media', safe);

  try {
    const buffer = await fs.readFile(filePath);
    const ext = safe.split('.').pop()?.toLowerCase();
    const mime =
      ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'private, max-age=86400',
      },
    });
  } catch {
    return NextResponse.json({ error: 'file not found', filename: safe }, { status: 404 });
  }
}
