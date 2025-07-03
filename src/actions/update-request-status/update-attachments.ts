"use server";
import { db } from '@/db';
import { requests, Request } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function updateRequestAttachments(params: { customId: string; attachments: { id: string; name: string; webViewLink?: string }[]; changedBy: string; comment: string; action: 'add' | 'remove' }): Promise<{ success?: string; error?: string }> {
  try {
    const { customId, attachments, changedBy, comment, action } = params;
    // Buscar a requisição pelo customId para obter o id numérico
    const [request] = await db.select().from(requests).where(eq(requests.customId, customId));
    if (!request) return { error: 'Requisição não encontrada.' };
    const id = request.id;
    // Buscar statusHistory mais recente do banco
    const prevHistory = Array.isArray(request?.statusHistory) ? request.statusHistory : [];
    const newHistory = [
      ...prevHistory,
      {
        status: (action === 'add' ? 'attachment_added' : 'attachment_removed') as 'attachment_added' | 'attachment_removed',
        changedAt: new Date().toISOString(),
        changedBy,
        comment,
      },
    ];
    const [updatedRequest]: Request[] = await db
      .update(requests)
      .set({ attachments, updatedAt: new Date(), statusHistory: newHistory })
      .where(eq(requests.id, id))
      .returning();
    if (!updatedRequest) {
      return { error: 'Requisição não encontrada.' };
    }
    return { success: `Anexos da requisição #${customId} atualizados!` };
  } catch (error) {
    console.error(error);
    return { error: 'Ocorreu um erro ao atualizar os anexos.' };
  }
} 