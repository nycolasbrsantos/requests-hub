'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { and, gte, lte } from 'drizzle-orm'

import { db } from '@/db'
import { requests } from '@/db/schema'
import { actionClient } from '@/lib/safe-actions'
import { createRequestSchema } from './schema'

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

    const [newRequest] = await db
      .insert(requests)
      .values({ ...parsedInput, customId })
      .returning();

    revalidatePath('/requests');

    return {
      success: `Requisição ${newRequest.customId} criada com sucesso!`,
    };
  } catch (error) {
    console.error(error);
    return {
      error: 'Ocorreu um erro no servidor. Não foi possível criar a requisição.',
    };
  }
}

// Exporta a action já validada e tipada
export const createRequest = actionClient
  .inputSchema(createRequestSchema)
  .action(handler)
