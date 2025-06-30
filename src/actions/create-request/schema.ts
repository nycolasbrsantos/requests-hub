import { z } from 'zod'

// Schema de validação para a criação de uma requisição.
export const createRequestSchema = z.object({
  requesterName: z.string().min(1, 'Nome do requisitante é obrigatório'),
  title: z.string().min(3, 'O título precisa ter no mínimo 3 caracteres.'),
  description: z.string().optional(),
  type: z.enum(['purchase', 'maintenance', 'it_ticket']),

  // Compra
  productName: z.string().optional(),
  quantity: z.coerce.number().positive('A quantidade deve ser positiva').optional(),
  unitPrice: z.string().optional(), // Drizzle espera um string para o tipo 'decimal'
  supplier: z.string().optional(),

  // Manutenção
  equipment: z.string().optional(),
  location: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),

  // T.I.
  category: z.string().optional(),
  attachments: z.array(z.string()).max(5).optional(),
})
