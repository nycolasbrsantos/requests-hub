import { z } from 'zod'

// Schema para validar os dados ao atualizar o status de uma requisição.
export const updateRequestStatusSchema = z.object({
  customId: z.string(),
  status: z.enum([
    'pending',
    'need_approved',
    'finance_approved',
    'awaiting_delivery',
    'rejected',
    'in_progress',
    'completed',
  ]),
  changedBy: z.string().optional(),
  comment: z.string().min(1, 'Comentário obrigatório'),
  poNumber: z.string().optional(), // Número da PO quando aprovada
  carrier: z.string().optional(),
  trackingCode: z.string().optional(),
  deliveryProof: z.any().optional(),
})
