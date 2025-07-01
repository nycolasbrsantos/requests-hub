import {
  decimal,
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
  'pending',
  'approved',
  'rejected',
  'in_progress',
  'completed',
])

// Enum para a prioridade (usado em Manutenção e T.I.)
export const requestPriorityEnum = pgEnum('request_priority', [
  'low',
  'medium',
  'high',
])

// Enum para os papéis de usuário
export const userRoleEnum = pgEnum('user_role', [
  'admin',
  'supervisor',
  'encarregado',
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
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }),
  supplier: varchar('supplier', { length: 256 }),

  // --- Campos específicos para 'Ordem de Manutenção' ---
  equipment: varchar('equipment', { length: 256 }),
  location: varchar('location', { length: 256 }),
  priority: requestPriorityEnum('priority'),

  // --- Campos específicos para 'Ticket de T.I.' ---
  category: varchar('category', { length: 100 }), // Ex: Hardware, Software, Rede
  attachments: json('attachments').$type<{ id: string; name: string; webViewLink?: string }[]>().default([]),
  statusHistory: json('status_history').$type<{
    status: 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'attachment_added' | 'attachment_removed';
    changedAt: string;
    changedBy: string;
    comment?: string;
  }[]>().default([]),
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

// Tipos TypeScript que o Drizzle infere do nosso schema.
// Isso nos dá autocompletar e segurança de tipos em todo o código!
export type Request = typeof requests.$inferSelect
export type NewRequest = typeof requests.$inferInsert
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type File = typeof files.$inferSelect
export type NewFile = typeof files.$inferInsert
