import { z } from 'zod'

// Schema de validação para a criação de uma requisição.
// Ele garante que os dados do formulário estão corretos antes de irem para o banco.
export const createRequestSchema = z.object({
  requesterName: z.string().min(1, 'Nome do requisitante é obrigatório'),
  title: z.string().min(3, 'O título precisa ter no mínimo 3 caracteres.'),
  description: z.string().optional(),
  type: z.enum(['purchase', 'maintenance', 'it_ticket']),

  // Campos condicionais baseados no tipo de requisição
  // Compra
  productName: z.string().optional(),
  quantity: z.coerce.number().positive('A quantidade deve ser positiva').optional(),
  unitPrice: z.coerce.number().positive('O preço deve ser positivo').optional(),
  supplier: z.string().optional(),

  // Manutenção
  equipment: z.string().optional(),
  location: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),

  // T.I.
  category: z.string().optional(),
})
