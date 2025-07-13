import { z } from 'zod'

// Schema de validação para a criação de uma requisição.
export const createRequestSchema = z.object({
  requesterName: z.string().min(1, 'Requester name is required'),
  title: z.string().min(3, 'The title must be at least 3 characters.'),
  description: z.string().min(5, 'Describe the need.').optional(),
  type: z.enum(['purchase', 'maintenance', 'it_ticket'], { errorMap: () => ({ message: 'Request type is required.' }) }),

  // Purchase
  productName: z.string().min(2, 'Enter the product name.').optional(),
  quantity: z.coerce.number().min(1, 'Quantity must be greater than zero.').optional(),
  unitPriceInCents: z.coerce.number().min(1, 'Enter the unit price.').optional(),
  supplier: z.string().min(2, 'Enter the supplier.').optional(),

  // Maintenance
  equipment: z.string().optional(),
  location: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high'], { errorMap: () => ({ message: 'Select the priority.' }) }).optional(),

  // IT
  category: z.string().optional(),
  attachments: z.array(
    z.union([
      z.string(),
      z.object({
        id: z.string(),
        name: z.string(),
        webViewLink: z.string().optional(),
      }),
      // Allow File for direct upload
      z.instanceof(File)
    ])
  ).max(5).optional(),
})
