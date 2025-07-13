import { z } from 'zod'

// Schema de validação adaptativo para criação de requisição (produto ou serviço)
export const createRequestSchema = z.object({
  type: z.enum(['product', 'service'], { errorMap: () => ({ message: 'Tipo de requisição é obrigatório.' }) }),
  requesterName: z.string().min(1, 'Nome do requisitante é obrigatório'),
  title: z.string().min(3, 'O título deve ter pelo menos 3 caracteres.'),
  description: z.string().min(5, 'Descreva a necessidade.').optional(),
  priority: z.enum(['low', 'medium', 'high'], { errorMap: () => ({ message: 'Selecione a prioridade.' }) }),
  attachments: z.array(
    z.union([
      z.string(),
      z.object({
        id: z.string(),
        name: z.string(),
        webViewLink: z.string().optional(),
      }),
      z.instanceof(File)
    ])
  ).max(5).optional(),

  // Produto
  productName: z.string().min(2, 'Informe o nome do produto.').optional(),
  quantity: z.coerce.number().min(1, 'Quantidade deve ser maior que zero.').optional(),
  unitPriceInCents: z.coerce.number().min(1, 'Informe o valor unitário.').optional(),
  supplier: z.string().min(2, 'Informe o fornecedor.').optional(),

  // Serviço
  serviceDescription: z.string().min(5, 'Descreva o serviço.').optional(),
  company: z.string().min(2, 'Informe a empresa executora.').optional(),
  scheduledDate: z.string().optional(),
  technicalResponsible: z.string().optional(),
  budgets: z.array(z.any()).max(5).optional(),
})
.refine((data) => {
  if (data.type === 'product') {
    return !!data.productName && !!data.quantity && !!data.unitPriceInCents && !!data.supplier;
  }
  if (data.type === 'service') {
    return !!data.serviceDescription && !!data.company;
  }
  return false;
}, {
  message: 'Preencha todos os campos obrigatórios conforme o tipo de requisição.',
});
