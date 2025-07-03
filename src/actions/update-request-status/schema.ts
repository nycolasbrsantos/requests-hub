import { z } from 'zod'

// Schema para validar os dados ao atualizar o status de uma requisição.
export const updateRequestStatusSchema = z.object({
  customId: z.string(),
  status: z.enum([
    'pending',
    'approved',
    'rejected',
    'in_progress',
    'completed',
  ]),
  changedBy: z.string().optional(),
  comment: z.string().min(1, 'Comentário obrigatório'),
})
