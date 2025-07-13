import { z } from 'zod'

// Adaptive validation schema for request creation (product, service, maintenance)
export const createRequestSchema = z.object({
  type: z.enum(['purchase', 'service', 'maintenance'], { errorMap: () => ({ message: 'Request type is required.' }) }),
  requesterName: z.string().min(1, 'Requester name is required'),
  title: z.string().min(3, 'The title must be at least 3 characters.'),
  description: z.string().min(5, 'Describe the need.').optional(),
  priority: z.enum(['low', 'medium', 'high'], { errorMap: () => ({ message: 'Select the priority.' }) }),
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

  // Product
  productName: z.string().min(2, 'Enter the product name.').optional(),
  quantity: z.coerce.number().min(1, 'Quantity must be greater than zero.').optional(),
  unitPriceInCents: z.coerce.number().min(1, 'Enter the unit price.').optional(),
  supplier: z.string().min(2, 'Enter the supplier.').optional(),

  // Service
  serviceDescription: z.string().min(5, 'Describe the service.').optional(),
  company: z.string().min(2, 'Enter the provider company.').optional(),
  scheduledDate: z.string().optional(),
  technicalResponsible: z.string().optional(),
  budgets: z.array(z.any()).max(5).optional(),

  // Maintenance
  location: z.string().min(2, 'Enter the location.').optional(),
  maintenanceType: z.string().min(2, 'Enter the maintenance type.').optional(),
})
.refine((data) => {
  if (data.type === 'purchase') {
    return !!data.productName && !!data.quantity && !!data.unitPriceInCents && !!data.supplier;
  }
  if (data.type === 'service') {
    return !!data.serviceDescription && !!data.company;
  }
  if (data.type === 'maintenance') {
    return !!data.location && !!data.maintenanceType;
  }
  return false;
}, {
  message: 'Fill in all required fields according to the request type.',
});
