import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { mimeFromFilename } from '@/lib/whatsapp-media-download';

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
    const mime = mimeFromFilename(safe);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'private, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return NextResponse.json({ error: 'file not found', filename: safe }, { status: 404 });
  }
}
