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
    let attachments = [];
    try {
      attachments = await db.select().from(files).where(eq(files.requestId, requestId));
    } catch (err) {
      console.error('Erro ao buscar anexos no banco:', err);
      return NextResponse.json({ attachments: [] });
    }
    if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
      return NextResponse.json({ attachments: [] });
    }
    // Gera webViewLink padrão do Drive
    const result = attachments.map((att: any) => ({
      id: att.id,
      filename: att.filename,
      originalName: att.originalName,
      mimeType: att.mimeType,
      webViewLink: att.filename ? `https://drive.google.com/file/d/${att.filename}/view` : '',
      uploadedBy: att.uploadedBy || '',
    }));
    return NextResponse.json({ attachments: result });
  } catch (error) {
    console.error('Erro detalhado na rota de anexos:', error);
    return NextResponse.json({ error: 'Erro ao buscar anexos.', details: String(error) }, { status: 500 });
  }
} 