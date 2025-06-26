'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

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
    const [newRequest] = await db
      .insert(requests)
      .values(parsedInput)
      .returning()

    revalidatePath('/requests')

    return {
      success: `Requisição #${newRequest.id} criada com sucesso!`,
    }
  } catch (error) {
    console.error(error)
    return {
      error: 'Ocorreu um erro no servidor. Não foi possível criar a requisição.',
    }
  }
}

// Exporta a action já validada e tipada
export const createRequest = actionClient
  .inputSchema(createRequestSchema)
  .action(handler)
