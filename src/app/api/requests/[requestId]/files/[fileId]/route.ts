import { NextRequest, NextResponse } from 'next/server';
import { deleteFile } from '@/lib/google-drive';
import { db } from '@/db';
import { files, requests } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { requestId: string; fileId: string } }
) {
  try {
    const requestId = Number(params.requestId);
    const fileId = params.fileId;
    if (isNaN(requestId) || !fileId) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Busca o arquivo no banco
    const [file] = await db.select().from(files).where(eq(files.filename, fileId));
    if (!file) {
      return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 });
    }

    // Remove do Google Drive
    await deleteFile(fileId);

    // Remove do banco
    await db.delete(files).where(eq(files.filename, fileId));

    // Atualiza histórico da requisição
    const [request] = await db.select().from(requests).where(eq(requests.id, requestId));
    const prevHistory = Array.isArray(request?.statusHistory) ? request.statusHistory : [];
    const newHistory = [
      ...prevHistory,
      {
        status: 'attachment_removed',
        changedAt: new Date().toISOString(),
        changedBy: file.uploadedBy,
        comment: `Removido arquivo ${file.originalName}`,
      },
    ];
    await db.update(requests).set({ statusHistory: newHistory, updatedAt: new Date() }).where(eq(requests.id, requestId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao remover arquivo.' }, { status: 500 });
  }
} 