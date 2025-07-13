"use server"

import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { requests } from '@/db/schema'
import { actionClient } from '@/lib/safe-actions'
import { eq } from 'drizzle-orm'
import { updateRequestStatusSchema } from './schema'
import { generatePOPdf } from '@/lib/generate-po-pdf'
import { uploadFileToFolder, organizePOFiles } from '@/lib/google-drive'
import { generatePRPdf } from '@/lib/generate-pr-pdf'

const handler = async ({ parsedInput }: { parsedInput: {
  customId: string;
  status: 'pending' | 'need_approved' | 'finance_approved' | 'awaiting_delivery' | 'rejected' | 'in_progress' | 'completed';
  changedBy?: string;
  comment: string;
  poNumber?: string;
  carrier?: string;
  trackingCode?: string;
  deliveryProof?: { id: string; name: string; webViewLink?: string }[];
} }) => {
  try {
    const { customId, status, changedBy, comment, poNumber } = parsedInput
    const [request] = await db.select().from(requests).where(eq(requests.customId, customId))
    const prevHistory = Array.isArray(request?.statusHistory) ? request.statusHistory : []
    const newHistory = [
      ...prevHistory,
      {
        status,
        changedAt: new Date().toISOString(),
        changedBy: changedBy || 'Desconhecido',
        comment,
        poNumber: poNumber || undefined,
      },
    ]

    // Preparar dados de atualização baseados no status
    const updateData: {
      status: 'pending' | 'need_approved' | 'finance_approved' | 'awaiting_delivery' | 'rejected' | 'in_progress' | 'completed';
      updatedAt: Date;
      statusHistory: typeof newHistory;
      needApprovedBy?: string;
      financeApprovedBy?: string;
      poNumber?: string;
      executedBy?: string;
      carrier?: string;
      trackingCode?: string;
      deliveryProof?: { id: string; name: string; webViewLink?: string }[];
    } = { 
      status, 
      updatedAt: new Date(), 
      statusHistory: newHistory 
    }

    // Adicionar campos de entrega se presentes
    if (parsedInput.carrier) {
      updateData.carrier = parsedInput.carrier;
    }
    if (parsedInput.trackingCode) {
      updateData.trackingCode = parsedInput.trackingCode;
    }
    if (Array.isArray(parsedInput.deliveryProof)) {
      updateData.deliveryProof = parsedInput.deliveryProof;
    }

    // Atualizar campos específicos baseados no status
    if (status === 'need_approved') {
      updateData.needApprovedBy = changedBy || 'Desconhecido'
    } else if (status === 'finance_approved') {
      updateData.financeApprovedBy = changedBy || 'Desconhecido'
      updateData.poNumber = poNumber
    } else if (status === 'in_progress') {
      updateData.executedBy = changedBy || 'Desconhecido'
    }

    const [updatedRequest] = await db
      .update(requests)
      .set(updateData)
      .where(eq(requests.customId, customId))
      .returning()

    if (!updatedRequest) {
      return { error: 'Requisição não encontrada.' }
    }

    // Criar estrutura de pastas para PO no Google Drive se necessário
    let poFolderId: string | undefined = undefined;
    if (status === 'finance_approved' && poNumber && updatedRequest.driveFolderId) {
      try {
        // Organizar arquivos da PO (criar pasta e mover arquivos)
        poFolderId = await organizePOFiles(updatedRequest.driveFolderId, poNumber, []);
        console.log(`Estrutura de pastas criada para PO ${poNumber}`);
        
        // Gerar PDF da PO aprovada
        const [requestForPdf] = await db.select().from(requests).where(eq(requests.customId, customId));
        if (requestForPdf) {
          const poPdfBuffer = await generatePOPdf({
            customId: requestForPdf.customId ?? '',
            poNumber: requestForPdf.poNumber as string | undefined,
            createdAt: requestForPdf.createdAt?.toISOString?.() ?? (typeof requestForPdf.createdAt === 'string' ? requestForPdf.createdAt : ''),
            requesterName: requestForPdf.requesterName ?? '',
            status: requestForPdf.status ?? '',
            productName: requestForPdf.productName ?? undefined,
            quantity: requestForPdf.quantity ?? undefined,
            unitPriceInCents: requestForPdf.unitPriceInCents ? String(requestForPdf.unitPriceInCents) : undefined,
            supplier: requestForPdf.supplier ?? undefined,
            priority: requestForPdf.priority ?? undefined,
            description: requestForPdf.description ?? undefined,
            needApprovedBy: requestForPdf.needApprovedBy ?? undefined,
            financeApprovedBy: requestForPdf.financeApprovedBy ?? undefined,
            executedBy: requestForPdf.executedBy ?? undefined,
            statusHistory: Array.isArray(requestForPdf.statusHistory) ? requestForPdf.statusHistory : [],
            attachments: Array.isArray(requestForPdf.attachments) ? requestForPdf.attachments : [],
          }, false); // false = PO aprovada, não concluída
          
          const poPdfFileName = `PO-${poNumber}-aprovada.pdf`;
          const poPdfFile = await uploadFileToFolder(
            poPdfBuffer,
            poPdfFileName,
            'application/pdf',
            poFolderId || requestForPdf.driveFolderId || undefined
          );
          
          // Atualizar attachments para incluir o PDF da PO
          const updatedAttachments = [
            ...((Array.isArray(requestForPdf.attachments) ? requestForPdf.attachments : []).map(att => ({
              id: att.id ?? '',
              name: att.name ?? '',
              webViewLink: att.webViewLink ?? undefined,
            }))),
            { id: poPdfFile.id ?? '', name: poPdfFile.name ?? '', webViewLink: poPdfFile.webViewLink ?? undefined },
          ];
          await db.update(requests)
            .set({ attachments: updatedAttachments })
            .where(eq(requests.customId, customId));
        }
      } catch (error) {
        console.error('Erro ao criar estrutura de pastas da PO:', error);
        // Não falhar a operação se der erro no Google Drive
      }
    }

    // Geração e upload do PDF ao concluir
    if (status === 'completed') {
      // Buscar dados atualizados da requisição
      const [requestAfterUpdate] = await db.select().from(requests).where(eq(requests.customId, customId));
      if (requestAfterUpdate && requestAfterUpdate.driveFolderId) {
        let prPdfFile = null;
        // Gerar PDF final da PR (modelo PR)
        if (!requestAfterUpdate.poNumber) {
          const prPdfBuffer = await generatePRPdf({
            customId: requestAfterUpdate.customId ?? '',
            createdAt: requestAfterUpdate.createdAt?.toISOString?.() ?? (typeof requestAfterUpdate.createdAt === 'string' ? requestAfterUpdate.createdAt : ''),
            requesterName: requestAfterUpdate.requesterName ?? '',
            status: requestAfterUpdate.status ?? '',
            productName: requestAfterUpdate.productName ?? undefined,
            quantity: requestAfterUpdate.quantity ?? undefined,
            unitPriceInCents: requestAfterUpdate.unitPriceInCents ? String(requestAfterUpdate.unitPriceInCents) : undefined,
            supplier: requestAfterUpdate.supplier ?? undefined,
            priority: requestAfterUpdate.priority ?? undefined,
            description: requestAfterUpdate.description ?? undefined,
            needApprovedBy: requestAfterUpdate.needApprovedBy ?? undefined,
            statusHistory: Array.isArray(requestAfterUpdate.statusHistory) ? requestAfterUpdate.statusHistory : [],
            attachments: Array.isArray(requestAfterUpdate.attachments) ? requestAfterUpdate.attachments : [],
          });
          const prPdfFileName = `Requisicao-${requestAfterUpdate.customId}.pdf`;
          prPdfFile = await uploadFileToFolder(
            prPdfBuffer,
            prPdfFileName,
            'application/pdf',
            requestAfterUpdate.driveFolderId
          );
        }
        // Gerar PDF final da PO concluída (se for uma PO)
        let poPdfFile = null;
        let poFolderIdFinal = poFolderId;
        if (requestAfterUpdate.poNumber) {
          // Garante que a subpasta da PO existe
          if (!poFolderIdFinal) {
            poFolderIdFinal = await organizePOFiles(requestAfterUpdate.driveFolderId, requestAfterUpdate.poNumber, []);
          }
          const poPdfBuffer = await generatePOPdf({
            customId: requestAfterUpdate.customId ?? '',
            poNumber: requestAfterUpdate.poNumber || undefined,
            createdAt: requestAfterUpdate.createdAt?.toISOString?.() ?? (typeof requestAfterUpdate.createdAt === 'string' ? requestAfterUpdate.createdAt : ''),
            requesterName: requestAfterUpdate.requesterName ?? '',
            status: requestAfterUpdate.status ?? '',
            productName: requestAfterUpdate.productName ?? undefined,
            quantity: requestAfterUpdate.quantity ?? undefined,
            unitPriceInCents: requestAfterUpdate.unitPriceInCents ? String(requestAfterUpdate.unitPriceInCents) : undefined,
            supplier: requestAfterUpdate.supplier ?? undefined,
            priority: requestAfterUpdate.priority ?? undefined,
            description: requestAfterUpdate.description ?? undefined,
            needApprovedBy: requestAfterUpdate.needApprovedBy ?? undefined,
            financeApprovedBy: requestAfterUpdate.financeApprovedBy ?? undefined,
            executedBy: requestAfterUpdate.executedBy ?? undefined,
            statusHistory: Array.isArray(requestAfterUpdate.statusHistory) ? requestAfterUpdate.statusHistory : [],
            attachments: Array.isArray(requestAfterUpdate.attachments) ? requestAfterUpdate.attachments : [],
          }, true); // true = PO concluída
          
          const poPdfFileName = `PO-${requestAfterUpdate.poNumber}-concluida.pdf`;
          poPdfFile = await uploadFileToFolder(
            poPdfBuffer,
            poPdfFileName,
            'application/pdf',
            poFolderIdFinal || requestAfterUpdate.driveFolderId
          );
        }
        // Atualiza os attachments para incluir os novos PDFs
        const updatedAttachments = [
          ...((Array.isArray(requestAfterUpdate.attachments) ? requestAfterUpdate.attachments : []).map(att => ({
            id: att.id ?? '',
            name: att.name ?? '',
            webViewLink: att.webViewLink ?? undefined,
          }))),
        ];
        if (prPdfFile) {
          updatedAttachments.push({
            id: prPdfFile.id ?? '',
            name: prPdfFile.name ?? '',
            webViewLink: prPdfFile.webViewLink ?? undefined
          });
        }
        if (poPdfFile) {
          updatedAttachments.push({ 
            id: poPdfFile.id ?? '', 
            name: poPdfFile.name ?? '', 
            webViewLink: poPdfFile.webViewLink ?? undefined 
          });
        }
        await db.update(requests)
          .set({ attachments: updatedAttachments })
          .where(eq(requests.customId, customId));
      }
    }

    // Se for awaiting_delivery ou completed, atualizar anexos com comprovante
    if ((status === 'awaiting_delivery' || status === 'completed') && Array.isArray(parsedInput.deliveryProof) && parsedInput.deliveryProof.length > 0) {
      const [requestForProof] = await db.select().from(requests).where(eq(requests.customId, customId));
      if (requestForProof) {
        const updatedAttachments = [
          ...((Array.isArray(requestForProof.attachments) ? requestForProof.attachments : []).map(att => ({
            id: att.id ?? '',
            name: att.name ?? '',
            webViewLink: att.webViewLink ?? undefined,
          }))),
          ...parsedInput.deliveryProof,
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