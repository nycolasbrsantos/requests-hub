'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { requests } from '@/db/schema'
import { actionClient } from '@/lib/safe-actions'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { Request } from '@/db/schema'

import { updateRequestStatusSchema } from './schema'

const handler = async ({
  parsedInput,
}: {
  parsedInput: z.infer<typeof updateRequestStatusSchema>
}) => {
  try {
    const { id, status } = parsedInput

    // Encontra a requisição pelo ID e atualiza o seu status
    const [updatedRequest] = await db
      .update(requests)
      .set({ status, updatedAt: new Date() })
      .where(eq(requests.id, id))
      .returning()

    if (!updatedRequest) {
      return { error: 'Requisição não encontrada.' }
    }

    // Recarrega os dados da página para refletir a mudança
    revalidatePath('/requests')

    return { success: `Status da requisição #${id} atualizado!` }
  } catch (error) {
    console.error(error)
    return { error: 'Ocorreu um erro ao atualizar o status.' }
  }
}

export const updateRequestStatus = actionClient
  .inputSchema(updateRequestStatusSchema)
  .action(handler)

export type UpdateRequestStatusAction = typeof updateRequestStatus

export const updateRequestAttachmentsSchema = z.object({
  id: z.number(),
  attachments: z.array(z.object({ filename: z.string(), uploadedBy: z.string() })).max(5),
})

/**
 * Atualiza os anexos de uma requisição.
 * @param params.id ID da requisição
 * @param params.attachments Array de anexos { filename, uploadedBy }
 */
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
    revalidatePath('/requests');
    return { success: `Anexos da requisição #${id} atualizados!` };
  } catch (error) {
    console.error(error);
    return { error: 'Ocorreu um erro ao atualizar os anexos.' };
  }
}