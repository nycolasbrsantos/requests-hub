/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { deleteFile } from '@/lib/google-drive';
import { db } from '@/db';
import { files, requests } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function DELETE(
  req: NextRequest,
  context: any
) {
  try {
    const { params } = await context;
    const customId = params.requestId;
    const fileId = Number(params.fileId);
    if (isNaN(fileId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Busca o arquivo no banco pelo id
    const [file] = await db.select().from(files).where(eq(files.id, fileId));
    if (!file) {
      return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 });
    }

    // Busca o request principal pelo customId
    const [request] = await db.select().from(requests).where(eq(requests.customId, customId));
    if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    const reqIdNum = request.id;

    // Remove do Google Drive usando driveFileId
    await deleteFile(file.driveFileId);

    // Remove do banco pelo id
    await db.delete(files).where(eq(files.id, fileId));

    // Atualiza histórico da requisição
    const prevHistory = Array.isArray(request?.statusHistory)
      ? request.statusHistory.filter((h): h is {
          status: 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'attachment_added' | 'attachment_removed';
          changedAt: string;
          changedBy: string;
          comment?: string;
        } =>
          h && typeof h === 'object' &&
          typeof h.status === 'string' &&
          [
            'pending',
            'approved',
            'rejected',
            'in_progress',
            'completed',
            'attachment_added',
            'attachment_removed',
          ].includes(h.status)
      )
      : [];
    const newHistory: {
      status: 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'attachment_added' | 'attachment_removed';
      changedAt: string;
      changedBy: string;
      comment?: string;
    }[] = [
      ...prevHistory,
      {
        status: 'attachment_removed',
        changedAt: new Date().toISOString(),
        changedBy: file.uploadedBy,
        comment: `Removido arquivo ${file.originalName}`,
      },
    ];
    await db.update(requests).set({ statusHistory: newHistory, updatedAt: new Date() }).where(eq(requests.id, reqIdNum));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao remover arquivo.' }, { status: 500 });
  }
}