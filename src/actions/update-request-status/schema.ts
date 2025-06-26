import { z } from 'zod'

// Schema para validar os dados ao atualizar o status de uma requisição.
export const updateRequestStatusSchema = z.object({
  id: z.number(),
  status: z.enum([
    'pending',
    'approved',
    'rejected',
    'in_progress',
    'completed',
  ]),
})
