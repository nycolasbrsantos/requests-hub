'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { and, gte, lte } from 'drizzle-orm'
import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { requests } from '@/db/schema'
import { actionClient } from '@/lib/safe-actions'
import { createRequestSchema } from './schema'
import { generateRequestPdf } from '@/lib/generate-request-pdf'
import { uploadFileToFolder, getRootFolderIdByType, createFolder } from '@/lib/google-drive'

// Se você quiser manter o handler separado:
const handler = async ({
  parsedInput,
}: {
  parsedInput: z.infer<typeof createRequestSchema>
}) => {
  try {
    // Gera a data AAAAMMDD
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const dateStr = `${y}${m}${d}`;

    // Conta quantas requisições já existem para o dia
    const start = new Date(y, now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(y, now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const requestsToday = await db
      .select()
      .from(requests)
      .where(and(gte(requests.createdAt, start), lte(requests.createdAt, end)));
    const seq = String(requestsToday.length + 1).padStart(3, '0');
    const customId = `${dateStr}-${seq}`;

    // Corrigir attachments para o formato correto
    const attachments = Array.isArray(parsedInput.attachments)
      ? parsedInput.attachments.map((att) =>
          typeof att === 'string'
            ? { id: att, name: att }
            : { id: att.id, name: att.name, webViewLink: att.webViewLink }
        )
      : [];

    // LOGS DE DEPURAÇÃO
    console.log('parsedInput:', parsedInput);
    console.log('customId:', customId);
    console.log('insert object:', { ...parsedInput, customId, attachments });

    // Criação da subpasta no Google Drive
    const rootFolderId = getRootFolderIdByType(parsedInput.type as 'purchase' | 'it_support' | 'maintenance');
    const driveFolderId = await createFolder(`REQ-${customId}`, rootFolderId);

    const [newRequest] = await db
      .insert(requests)
      .values({
        ...parsedInput,
        customId,
        attachments,
        driveFolderId,
        // Garante que unitPrice seja string (Drizzle espera string para decimal)
        unitPrice: parsedInput.unitPrice ? String(parsedInput.unitPrice) : undefined,
      })
      .returning();

    // Geração e upload do PDF detalhado da requisição
    if (newRequest) {
      const pdfBuffer = await generateRequestPdf({
        customId: newRequest.customId ?? '',
        createdAt: newRequest.createdAt?.toISOString?.() ?? (typeof newRequest.createdAt === 'string' ? newRequest.createdAt : ''),
        requesterName: newRequest.requesterName ?? '',
        status: newRequest.status ?? '',
        productName: newRequest.productName ?? undefined,
        quantity: newRequest.quantity ?? undefined,
        unitPrice: newRequest.unitPrice ? String(newRequest.unitPrice) : undefined,
        supplier: newRequest.supplier ?? undefined,
        priority: newRequest.priority ?? undefined,
        description: newRequest.description ?? undefined,
      });
      // Nome do arquivo PDF
      const pdfFileName = `Requisicao-${newRequest.customId}.pdf`;
      // Upload para a pasta da requisição
      if (newRequest.driveFolderId) {
        const pdfFile = await uploadFileToFolder(
          Buffer.from(pdfBuffer),
          pdfFileName,
          'application/pdf',
          newRequest.driveFolderId
        );
        // Atualiza os attachments para incluir o PDF
        const updatedAttachments = [
          ...((Array.isArray(newRequest.attachments) ? newRequest.attachments : []).map(att => ({
            id: att.id ?? '',
            name: att.name ?? '',
            webViewLink: att.webViewLink ?? undefined,
          }))),
          { id: pdfFile.id ?? '', name: pdfFile.name ?? '', webViewLink: pdfFile.webViewLink ?? undefined },
        ];
        await db.update(requests)
          .set({ attachments: updatedAttachments })
          .where(eq(requests.id, newRequest.id));
      }
    }

    revalidatePath('/requests');

    return {
      success: `Requisição ${newRequest.customId} criada com sucesso!`,
      id: newRequest.id,
    };
  } catch (error) {
    console.error('Erro detalhado ao criar requisição:', error);
    return {
      error: 'Ocorreu um erro no servidor. Não foi possível criar a requisição.',
      details: String(error),
    };
  }
}

// Exporta a action já validada e tipada
export const createRequest = actionClient
  .inputSchema(createRequestSchema)
  .action(handler)
