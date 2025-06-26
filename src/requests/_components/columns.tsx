'use client'

import { Badge } from '@/components/ui/badge'
import { Request } from '@/db/schema'
import { ColumnDef } from '@tanstack/react-table'
import dayjs from 'dayjs'

// Mapeamentos para exibir nomes amigáveis
const requestTypeMap: Record<Request['type'], string> = {
  purchase: 'Compra',
  maintenance: 'Manutenção',
  it_ticket: 'T.I.',
}

const requestStatusMap: Record<Request['status'], string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  in_progress: 'Em Progresso',
  completed: 'Concluído',
}

export const columns: ColumnDef<Request>[] = [
  {
    accessorKey: 'id',
    header: '#',
  },
  {
    accessorKey: 'title',
    header: 'Título',
  },
  {
    accessorKey: 'type',
    header: 'Tipo',
    cell: ({ row }) => <span>{requestTypeMap[row.original.type]}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status
      const variant: 'outline' | 'secondary' | 'default' | 'destructive' =
        status === 'pending'
          ? 'outline'
          : status === 'approved'
            ? 'default'
            : status === 'completed'
              ? 'secondary'
              : status === 'rejected'
                ? 'destructive'
                : 'outline'

      return <Badge variant={variant}>{requestStatusMap[status]}</Badge>
    },
  },
  {
    accessorKey: 'requesterName',
    header: 'Requisitante',
  },
  {
    accessorKey: 'createdAt',
    header: 'Criado em',
    cell: ({ row }) => (
      <span>{dayjs(row.getValue('createdAt')).format('DD/MM/YYYY')}</span>
    ),
  },
]
