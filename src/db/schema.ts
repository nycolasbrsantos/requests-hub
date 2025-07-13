import {
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  json,
} from 'drizzle-orm/pg-core'

// Enum para os tipos de requisição, para garantir consistência
export const requestTypeEnum = pgEnum('request_type', [
  'purchase',
  'maintenance',
  'it_ticket',
])

// Enum para o status das requisições
export const requestStatusEnum = pgEnum('request_status', [
  'pending',           // PR created, awaiting approval of necessity
  'need_approved',     // PR approved, now it's PO awaiting financial approval
  'finance_approved',  // PO approved financially, awaiting execution
  'awaiting_delivery', // PO awaiting delivery
  'rejected',          // Rejected at any stage
  'in_progress',       // In progress
  'completed',         // Completed
])

// Enum para a prioridade (usado em Manutenção e T.I.)
export const requestPriorityEnum = pgEnum('request_priority', [
  'low',
  'medium',
  'high',
])

// Enum for user roles
export const userRoleEnum = pgEnum('user_role', [
  'admin',
  'supervisor',
  'manager',
  'user',
])

// Tabela principal de requisições.
// Note que temos campos que serão usados apenas por certos tipos de requisição.
export const requests = pgTable('requests', {
  id: serial('id').primaryKey(),
  customId: varchar('custom_id', { length: 20 }).unique(),
  // Em um app real, este seria uma chave estrangeira para uma tabela de usuários.
  // Para simplificar, vamos guardar o nome diretamente por agora.
  requesterName: varchar('requester_name', { length: 256 }).notNull(),
  type: requestTypeEnum('type').notNull(),
  status: requestStatusEnum('status').default('pending').notNull(),
  title: varchar('title', { length: 256 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),

  // --- Campos específicos para 'Ordem de Compra' ---
  productName: varchar('product_name', { length: 256 }),
  quantity: integer('quantity'),
  unitPriceInCents: integer('unit_price_in_cents'), // Armazenado em centavos
  supplier: varchar('supplier', { length: 256 }),
  poNumber: varchar('po_number', { length: 20 }), // Número da PO quando aprovada
  needApprovedBy: varchar('need_approved_by', { length: 256 }), // Quem aprovou a necessidade
  financeApprovedBy: varchar('finance_approved_by', { length: 256 }), // Quem aprovou financeiramente
  executedBy: varchar('executed_by', { length: 256 }), // Quem executou a compra
  carrier: varchar('carrier', { length: 256 }), // Transportadora
  trackingCode: varchar('tracking_code', { length: 256 }), // Código de rastreio
  deliveryProof: json('delivery_proof').$type<{ id: string; name: string; webViewLink?: string }[]>().default([]), // Comprovante de entrega

  // --- Campos específicos para 'Ordem de Manutenção' ---
  equipment: varchar('equipment', { length: 256 }),
  location: varchar('location', { length: 256 }),
  priority: requestPriorityEnum('priority'),

  // --- Campos específicos para 'Ticket de T.I.' ---
  category: varchar('category', { length: 100 }), // Ex: Hardware, Software, Rede
  attachments: json('attachments').$type<{ id: string; name: string; webViewLink?: string }[]>().default([]),
  statusHistory: json('status_history').$type<{
    status: 'pending' | 'need_approved' | 'finance_approved' | 'awaiting_delivery' | 'rejected' | 'in_progress' | 'completed' | 'attachment_added' | 'attachment_removed';
    changedAt: string;
    changedBy: string;
    comment?: string;
    poNumber?: string; // Número da PO quando aprovada
  }[]>().default([]),
  driveFolderId: varchar('drive_folder_id', { length: 128 }),
})

// Tabela de usuários
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 256 }).notNull(),
  email: varchar('email', { length: 256 }).notNull().unique(),
  role: userRoleEnum('role').default('user').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Tabela para armazenar arquivos no banco de dados
export const files = pgTable('files', {
  id: serial('id').primaryKey(),
  filename: varchar('filename', { length: 512 }).notNull(),
  originalName: varchar('original_name', { length: 512 }).notNull(),
  mimeType: varchar('mime_type', { length: 128 }).notNull(),
  size: integer('size').notNull(),
  uploadedBy: varchar('uploaded_by', { length: 256 }).notNull(),
  requestId: integer('request_id').notNull().references(() => requests.id), // FK para requests
  driveFileId: varchar('drive_file_id', { length: 128 }).notNull(), // ID do arquivo no Google Drive
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Tabela filha para requisições de compras
export const purchaseRequests = pgTable('purchase_requests', {
  id: serial('id').primaryKey(),
  requestId: integer('request_id').notNull().references(() => requests.id),
  productName: varchar('product_name', { length: 256 }),
  quantity: integer('quantity'),
  unitPriceInCents: integer('unit_price_in_cents'), // Armazenado em centavos
  supplier: varchar('supplier', { length: 256 }),
  priority: requestPriorityEnum('priority'),
});

// Tabela filha para requisições de manutenção
export const maintenanceRequests = pgTable('maintenance_requests', {
  id: serial('id').primaryKey(),
  requestId: integer('request_id').notNull().references(() => requests.id),
  location: varchar('location', { length: 256 }),
  maintenanceType: varchar('maintenance_type', { length: 256 }),
  priority: requestPriorityEnum('priority'),
});

// Tabela filha para requisições de suporte de T.I.
export const itSupportRequests = pgTable('it_support_requests', {
  id: serial('id').primaryKey(),
  requestId: integer('request_id').notNull().references(() => requests.id),
  issueTitle: varchar('issue_title', { length: 256 }),
  urgency: requestPriorityEnum('urgency'),
  // Adicione outros campos específicos conforme necessário
});

// Tipos TypeScript que o Drizzle infere do nosso schema.
// Isso nos dá autocompletar e segurança de tipos em todo o código!
export type Request = typeof requests.$inferSelect
export type NewRequest = typeof requests.$inferInsert
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type File = typeof files.$inferSelect
export type NewFile = typeof files.$inferInsert
