"use server"

import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { requests } from '@/db/schema'
import { actionClient } from '@/lib/safe-actions'
import { eq } from 'drizzle-orm'
import { updateRequestStatusSchema } from './schema'

const handler = async ({ parsedInput }: { parsedInput: { id: number; status: 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed'; changedBy?: string; comment: string } }) => {
  try {
    const { id, status, changedBy, comment } = parsedInput
    const [request] = await db.select().from(requests).where(eq(requests.id, id))
    const prevHistory = Array.isArray(request?.statusHistory) ? request.statusHistory : []
    const newHistory = [
      ...prevHistory,
      {
        status,
        changedAt: new Date().toISOString(),
        changedBy: changedBy || 'Desconhecido',
        comment,
      },
    ]
    const [updatedRequest] = await db
      .update(requests)
      .set({ status, updatedAt: new Date(), statusHistory: newHistory })
      .where(eq(requests.id, id))
      .returning()

    if (!updatedRequest) {
      return { error: 'Requisição não encontrada.' }
    }

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