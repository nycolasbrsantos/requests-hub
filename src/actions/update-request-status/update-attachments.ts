"use server";
import { db } from '@/db';
import { requests, Request } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function updateRequestAttachments(params: { id: number; attachments: { filename: string; uploadedBy: string }[] }): Promise<{ success?: string; error?: string }> {
  try {
    const { id, attachments } = params;
    const [updatedRequest]: Request[] = await db
      .update(requests)
      .set({ attachments, updatedAt: new Date() })
      .where(eq(requests.id, id))
      .returning();
    if (!updatedRequest) {
      return { error: 'Requisição não encontrada.' };
    }
    return { success: `Anexos da requisição #${id} atualizados!` };
  } catch (error) {
    console.error(error);
    return { error: 'Ocorreu um erro ao atualizar os anexos.' };
  }
} 