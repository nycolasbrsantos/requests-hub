import { z } from 'zod'

// Schema de validação para a criação de uma requisição.
export const createRequestSchema = z.object({
  requesterName: z.string().min(1, 'Nome do requisitante é obrigatório'),
  title: z.string().min(3, 'O título precisa ter no mínimo 3 caracteres.'),
  description: z.string().min(5, 'Descreva a necessidade.').optional(),
  type: z.enum(['purchase', 'maintenance', 'it_ticket'], { errorMap: () => ({ message: 'Tipo de requisição é obrigatório.' }) }),

  // Compra
  productName: z.string().min(2, 'Informe o nome do produto.').optional(),
  quantity: z.coerce.number().min(1, 'Quantidade deve ser maior que zero.').optional(),
  unitPrice: z.string().min(1, 'Informe o preço unitário.').optional(),
  supplier: z.string().min(2, 'Informe o fornecedor.').optional(),

  // Manutenção
  equipment: z.string().optional(),
  location: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high'], { errorMap: () => ({ message: 'Selecione a prioridade.' }) }).optional(),

  // T.I.
  category: z.string().optional(),
  attachments: z.array(
    z.union([
      z.string(),
      z.object({
        id: z.string(),
        name: z.string(),
        webViewLink: z.string().optional(),
      }),
      // Permitir File para upload direto
      z.instanceof(File)
    ])
  ).max(5).optional(),
})
