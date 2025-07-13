
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { and, gte, lte, eq } from 'drizzle-orm'

import { db } from '@/db'
import { requests, purchaseRequests, maintenanceRequests, itSupportRequests, users } from '@/db/schema'
import { actionClient } from '@/lib/safe-actions'
import { createRequestSchema } from './schema'
import { uploadFileToFolder, getRootFolderIdByType, createFolder } from '@/lib/google-drive'
import { reaisToCentavos } from '@/lib/utils'
import { generatePRPdf } from '@/lib/generate-pr-pdf'
import { createNotification } from '@/lib/notifications';
import { generateCustomId } from '@/lib/request-helpers'; // Importa o novo helper

// Se você quiser manter o handler separado:
const handler = async ({
  parsedInput,
}: {
  parsedInput: ReturnType<typeof createRequestSchema.parse>
}) => {
  try {
    // Gera o customId usando o helper
    const customId = await generateCustomId(parsedInput.type as 'purchase' | 'service' | 'maintenance');

    // Criação da subpasta no Google Drive
    let driveFolderId: string;
    try {
      const rootFolderId = getRootFolderIdByType(parsedInput.type as 'product' | 'service' | 'maintenance');
      driveFolderId = await createFolder(`${customId}`, rootFolderId);
    } catch (error) {
      console.error('Erro ao criar pasta no Google Drive:', error);
      return { error: 'Erro ao criar pasta no Google Drive. Por favor, tente novamente.' };
    }

    // Geração e upload do PDF detalhado da requisição
    let pdfFile;
    try {
      const pdfBuffer = await generatePRPdf({
        customId: customId,
        createdAt: new Date().toISOString(),
        requesterName: parsedInput.requesterName ?? '',
        status: 'pending',
        productName: parsedInput.productName ?? undefined,
        quantity: parsedInput.quantity ?? undefined,
        unitPriceInCents: parsedInput.unitPriceInCents ? String(parsedInput.unitPriceInCents) : undefined,
        supplier: parsedInput.supplier ?? undefined,
        priority: parsedInput.priority ?? undefined,
        description: parsedInput.description ?? undefined,
        needApprovedBy: undefined,
        statusHistory: [],
        attachments: [],
      });
      const pdfFileName = `Request-${customId}.pdf`;
      pdfFile = await uploadFileToFolder(
        pdfBuffer,
        pdfFileName,
        'application/pdf',
        driveFolderId
      );
    } catch (error) {
      console.error('Erro ao gerar ou fazer upload do PDF:', error);
      return { error: 'Erro ao gerar ou fazer upload do PDF da requisição. Por favor, tente novamente.' };
    }

    // Upload dos anexos recebidos como File
    const uploadedAttachments = [];
    if (Array.isArray(parsedInput.attachments)) {
      for (const att of parsedInput.attachments) {
        if (typeof File !== 'undefined' && att instanceof File) {
          try {
            const arrayBuffer = await att.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const driveFile = await uploadFileToFolder(
              buffer,
              att.name,
              att.type,
              driveFolderId
            );
            uploadedAttachments.push({
              id: driveFile.id ?? '',
              name: driveFile.name ?? att.name,
              webViewLink: driveFile.webViewLink ?? undefined,
            });
          } catch (error) {
            console.warn(`Erro ao fazer upload do anexo ${att.name}:`, error);
            // Não impede a criação da requisição, mas registra o erro
          }
        } else if (typeof att === 'object' && 'id' in att && 'name' in att) {
          uploadedAttachments.push(att);
        }
      }
    }
    // Sempre incluir o PDF como attachment
    uploadedAttachments.push({
      id: pdfFile.id ?? '',
      name: pdfFile.name ?? pdfFileName,
      webViewLink: pdfFile.webViewLink ?? undefined,
    });

    // Filtrar apenas objetos válidos para o banco
    const validAttachments = uploadedAttachments.filter(att => att && typeof att === 'object' && 'id' in att && 'name' in att);

    // Monta objeto para inserção
    const insertData: any = {
      ...parsedInput,
      customId,
      attachments: validAttachments,
      driveFolderId,
      unitPriceInCents: parsedInput.unitPriceInCents ? reaisToCentavos(parsedInput.unitPriceInCents) : undefined,
    };

    // Não gerar poNumber para maintenance
    if (parsedInput.type === 'maintenance') {
      insertData.poNumber = null;
    }

    // Agora sim, inserir a requisição no banco
    let newRequest;
    try {
      [newRequest] = await db
        .insert(requests)
        .values(insertData)
        .returning();
    } catch (error) {
      console.error('Erro ao inserir requisição no banco de dados:', error);
      return { error: 'Erro ao salvar a requisição no banco de dados. Por favor, tente novamente.' };
    }

    // Notificar usuário solicitante que a requisição foi criada
    if (newRequest) {
      try {
        const requesterUser = await db.select().from(users).where(eq(users.name, newRequest.requesterName)).then(r => r[0]);
        if (requesterUser) {
          await createNotification({
            userId: requesterUser.id,
            title: 'Request submitted successfully',
            body: `Hello,\n\nYour request has been successfully submitted.\n\nRequest Number: ${newRequest.customId}\n\nThank you for reaching out!\n\nBest regards,\nSupport Team`,
            link: `/requests/${newRequest.customId}`,
            type: 'in-app',
            sendEmailNotification: true,
          });
        }
      } catch (error) {
        console.warn('Erro ao enviar notificação:', error);
        // Não impede a criação da requisição, mas registra o erro
      }
    }

    // Inserir na tabela filha conforme o tipo
    if (newRequest) {
      try {
        if (newRequest.type === 'product') {
          await db.insert(purchaseRequests).values({
            requestId: newRequest.id,
            productName: parsedInput.productName,
            quantity: parsedInput.quantity,
            unitPriceInCents: parsedInput.unitPriceInCents ? reaisToCentavos(parsedInput.unitPriceInCents) : undefined,
            supplier: parsedInput.supplier,
            priority: parsedInput.priority,
          });
        } else if (newRequest.type === 'maintenance') {
          await db.insert(maintenanceRequests).values({
            requestId: newRequest.id,
            location: parsedInput.location,
            maintenanceType: parsedInput.maintenanceType,
            priority: parsedInput.priority,
          });
        } else if (newRequest.type === 'service') {
          // Aqui você pode criar uma tabela filha para serviços se desejar, ou apenas manter na principal
        }
      } catch (error) {
        console.warn('Erro ao inserir na tabela filha:', error);
        // Não impede a criação da requisição principal, mas registra o erro
      }
    }

    revalidatePath('/requests');

    return {
      success: `Request ${newRequest.customId} created successfully!`,
      id: newRequest.id,
    };
  } catch (error) {
    console.error('Erro inesperado na criação da requisição:', error);
    return {
      error: 'Ocorreu um erro inesperado ao criar a requisição. Por favor, tente novamente.',
      details: String(error),
    };
  }
}

// Exporta a action já validada e tipada
export const createRequest = actionClient
  .inputSchema(createRequestSchema)
  .action(handler)




