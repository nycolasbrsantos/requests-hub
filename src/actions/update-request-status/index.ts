"use server"

import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { requests } from '@/db/schema'
import { actionClient } from '@/lib/safe-actions'
import { eq } from 'drizzle-orm'
import { updateRequestStatusSchema } from './schema'
import { generateRequestPdf } from '@/lib/generate-request-pdf'
import { uploadFileToFolder } from '@/lib/google-drive'

const handler = async ({ parsedInput }: { parsedInput: { customId: string; status: 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed'; changedBy?: string; comment: string } }) => {
  try {
    const { customId, status, changedBy, comment } = parsedInput
    const [request] = await db.select().from(requests).where(eq(requests.customId, customId))
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
      .where(eq(requests.customId, customId))
      .returning()

    if (!updatedRequest) {
      return { error: 'Requisição não encontrada.' }
    }

    // Geração e upload do PDF ao concluir
    if (status === 'completed') {
      // Buscar dados atualizados da requisição
      const [requestAfterUpdate] = await db.select().from(requests).where(eq(requests.customId, customId));
      if (requestAfterUpdate && requestAfterUpdate.driveFolderId) {
        const pdfBuffer = await generateRequestPdf({
          customId: requestAfterUpdate.customId ?? '',
          createdAt: requestAfterUpdate.createdAt?.toISOString?.() ?? (typeof requestAfterUpdate.createdAt === 'string' ? requestAfterUpdate.createdAt : ''),
          requesterName: requestAfterUpdate.requesterName ?? '',
          status: requestAfterUpdate.status ?? '',
          productName: requestAfterUpdate.productName ?? undefined,
          quantity: requestAfterUpdate.quantity ?? undefined,
          unitPrice: requestAfterUpdate.unitPrice ? String(requestAfterUpdate.unitPrice) : undefined,
          supplier: requestAfterUpdate.supplier ?? undefined,
          priority: requestAfterUpdate.priority ?? undefined,
          description: requestAfterUpdate.description ?? undefined,
        });
        const pdfFileName = `Requisicao-${requestAfterUpdate.customId}-concluida.pdf`;
        const pdfFile = await uploadFileToFolder(
          Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer),
          pdfFileName,
          'application/pdf',
          requestAfterUpdate.driveFolderId
        );
        // Atualiza os attachments para incluir o novo PDF
        const updatedAttachments = [
          ...((Array.isArray(requestAfterUpdate.attachments) ? requestAfterUpdate.attachments : []).map(att => ({
            id: att.id ?? '',
            name: att.name ?? '',
            webViewLink: att.webViewLink ?? undefined,
          }))),
          { id: pdfFile.id ?? '', name: pdfFile.name ?? '', webViewLink: pdfFile.webViewLink ?? undefined },
        ];
        await db.update(requests)
          .set({ attachments: updatedAttachments })
          .where(eq(requests.customId, customId));
      }
    }

    revalidatePath('/requests')
    return { success: `Status da requisição #${customId} atualizado!` }
  } catch (error) {
    console.error(error)
    return { error: 'Ocorreu um erro ao atualizar o status.' }
  }
}

export const updateRequestStatus = actionClient
  .inputSchema(updateRequestStatusSchema)
  .action(handler)