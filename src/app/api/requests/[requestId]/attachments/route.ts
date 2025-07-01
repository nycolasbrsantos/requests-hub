import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { files } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const requestId = Number(params.requestId);
    if (isNaN(requestId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }
    // Busca anexos no banco
    const attachments = await db.select().from(files).where(eq(files.requestId, requestId));
    if (!attachments.length) {
      return NextResponse.json({ attachments: [] });
    }
    // Gera webViewLink padrão do Drive
    const result = attachments.map((att) => ({
      id: att.id,
      filename: att.filename,
      originalName: att.originalName,
      mimeType: att.mimeType,
      webViewLink: `https://drive.google.com/file/d/${att.filename}/view`,
      uploadedBy: att.uploadedBy,
    }));
    return NextResponse.json({ attachments: result });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar anexos.' }, { status: 500 });
  }
} 