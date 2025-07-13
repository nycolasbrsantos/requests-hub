'use server'

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

// Se você quiser manter o handler separado:
const handler = async ({
  parsedInput,
}: {
  parsedInput: ReturnType<typeof createRequestSchema.parse>
}) => {
  try {
    // Gera a data AAAAMMDD
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const dateStr = `${y}${m}${d}`;

    // Define prefixo conforme o tipo
    let prefix = 'PR';
    if (parsedInput.type === 'service') prefix = 'SR';
    if (parsedInput.type === 'maintenance') prefix = 'MR';

    // Conta quantas requisições já existem para o dia e tipo
    const start = new Date(y, now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(y, now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const requestsToday = await db
      .select()
      .from(requests)
      .where(
        and(
          gte(requests.createdAt, start),
          lte(requests.createdAt, end),
          eq(requests.type, parsedInput.type)
        )
      );
    const seq = String(requestsToday.length + 1).padStart(3, '0');
    const customId = `${prefix}-${dateStr}-${seq}`;

    // Criação da subpasta no Google Drive
    const rootFolderId = getRootFolderIdByType(parsedInput.type as 'product' | 'service' | 'maintenance');
    const driveFolderId = await createFolder(`${customId}`, rootFolderId);

    // Geração e upload do PDF detalhado da requisição
    const pdfBuffer = await generatePRPdf({
      customId: customId,
      createdAt: now.toISOString(),
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
    const pdfFile = await uploadFileToFolder(
      pdfBuffer,
      pdfFileName,
      'application/pdf',
      driveFolderId
    );

    // Upload dos anexos recebidos como File
    const uploadedAttachments = [];
    if (Array.isArray(parsedInput.attachments)) {
      for (const att of parsedInput.attachments) {
        if (typeof File !== 'undefined' && att instanceof File) {
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
    const [newRequest] = await db
      .insert(requests)
      .values(insertData)
      .returning();

    // Notificar usuário solicitante que a requisição foi criada
    if (newRequest) {
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
    }

    // Inserir na tabela filha conforme o tipo
    if (newRequest) {
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
    }

    revalidatePath('/requests');

    return {
      success: `Request ${newRequest.customId} created successfully!`,
      id: newRequest.id,
    };
  } catch (error) {
    console.error('Detailed error on request creation:', error);
    return {
      error: 'A server error occurred. Could not create the request.',
      details: String(error),
    };
  }
}

// Exporta a action já validada e tipada
export const createRequest = actionClient
  .inputSchema(createRequestSchema)
  .action(handler)
