'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { requests } from '@/db/schema'
import { createSafeAction } from 'next-safe-action'
import { z } from 'zod'

import { createRequestSchema } from './schema'

// Criamos uma "safe action" que usa o nosso schema Zod para validação.
// Isso garante que a lógica só executa se os dados forem válidos.
const handler = async (data: z.infer<typeof createRequestSchema>) => {
  try {
    // Usamos o Drizzle para inserir os dados na tabela 'requests'.
    const [newRequest] = await db.insert(requests).values(data).returning()

    // O revalidatePath avisa o Next.js para recarregar os dados na página de requisições,
    // para que a nova requisição apareça na tabela instantaneamente.
    revalidatePath('/requests')

    return {
      success: `Requisição #${newRequest.id} criada com sucesso!`,
    }
  } catch (error) {
    // Em um app de produção, logaríamos o erro para análise.
    console.error(error)
    return {
      error: 'Ocorreu um erro no servidor. Não foi possível criar a requisição.',
    }
  }
}

export const createRequest = createSafeAction(createRequestSchema, handler)
