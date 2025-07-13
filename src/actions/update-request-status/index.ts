import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { requests } from '@/db/schema'
import { actionClient } from '@/lib/safe-actions'
import { eq } from 'drizzle-orm'
import { updateRequestStatusSchema } from './schema'
import { generatePOPdf } from '@/lib/generate-po-pdf'
import { uploadFileToFolder, organizePOFiles, getFileBufferFromDrive } from '@/lib/google-drive'
import { generatePRPdf } from '@/lib/generate-pr-pdf'
import { createNotification } from '@/lib/notifications';
import { users } from '@/db/schema';

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
    
    let request;
    try {
      [request] = await db.select().from(requests).where(eq(requests.customId, customId));
      if (!request) {
        return { error: 'Requisição não encontrada.' };
      }
    } catch (error) {
      console.error('Erro ao buscar requisição no banco de dados:', error);
      return { error: 'Erro ao buscar requisição. Por favor, tente novamente.' };
    }

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

    let updatedRequest;
    try {
      [updatedRequest] = await db
        .update(requests)
        .set(updateData)
        .where(eq(requests.customId, customId))
        .returning();

      if (!updatedRequest) {
        return { error: 'Requisição não encontrada após atualização.' };
      }
    } catch (error) {
      console.error('Erro ao atualizar requisição no banco de dados:', error);
      return { error: 'Erro ao atualizar requisição. Por favor, tente novamente.' };
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
        console.error('Erro ao criar estrutura de pastas da PO ou gerar PDF:', error);
        // Não falhar a operação se der erro no Google Drive, mas registrar o erro
      }
    }

    // Geração e upload do PDF ao concluir
    if (status === 'completed') {
      // Buscar dados atualizados da requisição
      const [requestAfterUpdate] = await db.select().from(requests).where(eq(requests.customId, customId));
      if (requestAfterUpdate && requestAfterUpdate.driveFolderId) {
        let prPdfFile = null;
        let mergedPdfFile = null;
        try {
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

            // Se houver comprovante de compra, mesclar com o PDF da PO
            let mergedBuffer = poPdfBuffer;
            const deliveryProofs = Array.isArray(requestAfterUpdate.deliveryProof) ? requestAfterUpdate.deliveryProof : [];
            const pdfProof = deliveryProofs.find(att => att.name && att.name.toLowerCase().endsWith('.pdf') && att.id);
            if (pdfProof && pdfProof.id) {
              try {
                const proofBuffer = await getFileBufferFromDrive(pdfProof.id);
                // Mesclar usando pdfjs
                const pdfjs = await import('pdfjs');
                const { Document } = pdfjs;
                const { default: ExternalDocument } = await import('pdfjs/lib/external');
                const doc = new Document();
                const poExt = new ExternalDocument(poPdfBuffer);
                const proofExt = new ExternalDocument(proofBuffer);
                doc.addPagesOf(poExt);
                doc.addPagesOf(proofExt);
                mergedBuffer = await doc.asBuffer();
              } catch (mergeError) {
                console.warn('Erro ao mesclar PDFs:', mergeError);
                // Continua sem mesclar se houver erro
              }
            }
            const mergedPdfFileName = `${requestAfterUpdate.poNumber}-completed.pdf`;
            mergedPdfFile = await uploadFileToFolder(
              mergedBuffer,
              mergedPdfFileName,
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
          if (mergedPdfFile) {
            updatedAttachments.push({ 
              id: mergedPdfFile.id ?? '', 
              name: mergedPdfFile.name ?? '', 
              webViewLink: mergedPdfFile.webViewLink ?? undefined 
            });
          }
          await db.update(requests)
            .set({ attachments: updatedAttachments })
            .where(eq(requests.customId, customId));
        } catch (pdfError) {
          console.error('Erro ao gerar ou fazer upload de PDFs de conclusão:', pdfError);
          // Não falhar a operação se der erro na geração/upload de PDFs
        }
      }
    }

    // Se for awaiting_delivery ou completed, atualizar anexos com comprovante
    if ((status === 'awaiting_delivery' || status === 'completed') && Array.isArray(parsedInput.deliveryProof) && parsedInput.deliveryProof.length > 0) {
      try {
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
      } catch (attachmentError) {
        console.warn('Erro ao atualizar anexos com comprovante de entrega:', attachmentError);
        // Não impede a atualização do status, mas registra o erro
      }
    }

    // Notificar usuário se status for 'awaiting_delivery'
    if (status === 'awaiting_delivery') {
      try {
        // Buscar usuário pelo nome do solicitante
        const requesterUser = await db.select().from(users).where(eq(users.name, updatedRequest.requesterName)).then(r => r[0]);
        if (requesterUser) {
          await createNotification({
            userId: requesterUser.id,
            title: 'Your purchase order is awaiting delivery',
            body: `Your purchase order #${updatedRequest.customId} is now awaiting delivery. You will be notified when it is completed.`,
            link: `/requests/${updatedRequest.customId}`,
            type: 'in-app',
            sendEmailNotification: true,
          });
        }
      } catch (notificationError) {
        console.warn('Erro ao enviar notificação de awaiting_delivery:', notificationError);
        // Não impede a atualização do status, mas registra o erro
      }
    }

    revalidatePath('/requests')
    return { success: `Status da requisição #${customId} atualizado!` }
  } catch (error) {
    console.error('Ocorreu um erro inesperado ao atualizar o status:', error)
    return { error: 'Ocorreu um erro inesperado ao atualizar o status da requisição.' }
  }
}

export const updateRequestStatus = actionClient
  .inputSchema(updateRequestStatusSchema)
  .action(handler)


