'use client'

import { Row } from '@tanstack/react-table'
import { MoreHorizontal } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'

import { updateRequestStatus } from '@/actions/update-request-status'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Request } from '@/db/schema'

interface DataTableRowActionsProps<TData> {
  row: Row<TData>
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const request = row.original as Request

  const { execute, status } = useAction(updateRequestStatus, {
    onSuccess: ({ data }) => {
      // `data` aqui é { success: string } | { error: string }
      if ('success' in data) {
        toast.success(data.success)
      } else {
        toast.error(data.error)
      }
    },
    onError: (error) => {
      console.error('Erro na action:', error)
      toast.error('Ocorreu um erro inesperado ao atualizar o status.')
    },
  })

  const isExecuting = status === 'executing'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Abrir menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        <DropdownMenuLabel>Ações</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={isExecuting || request.status === 'approved'}
          onClick={() => execute({ id: request.id, status: 'approved' })}
        >
          Aprovar
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isExecuting || request.status === 'rejected'}
          onClick={() => execute({ id: request.id, status: 'rejected' })}
        >
          Rejeitar
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isExecuting}
          onClick={() => execute({ id: request.id, status: 'completed' })}
        >
          Marcar como Concluída
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

DataTableRowActions.displayName = 'DataTableRowActions'
