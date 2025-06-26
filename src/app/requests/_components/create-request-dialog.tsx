'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { PlusCircle } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { createRequest } from '@/actions/create-request'
import { createRequestSchema } from '@/actions/create-request/schema'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

// Opções para os Selects
const requestTypeOptions = {
  purchase: 'Ordem de Compra',
  maintenance: 'Ordem de Manutenção',
  it_ticket: 'Ticket de T.I.',
}
const priorityOptions = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
}
const itCategoryOptions = {
  hardware: 'Hardware',
  software: 'Software',
  network: 'Rede',
  account: 'Conta de Usuário',
}

export function CreateRequestDialog() {
  const [isOpen, setIsOpen] = useState(false)

  const form = useForm<z.infer<typeof createRequestSchema>>({
    resolver: zodResolver(createRequestSchema),
    defaultValues: {
      requesterName: 'Funcionário Exemplo', // viria da sessão num app real
      type: 'purchase',
      title: '',
      description: '',
    },
  })

  // Hook da next-safe-action
  const { execute, status } = useAction(createRequest, {
    onSuccess: ({ data }) => {
      // `data` aqui é { success: string } | { error: string }
      if ('success' in data) {
        toast.success(data.success)
        form.reset()
        setIsOpen(false)
      } else {
        toast.error(data.error)
      }
    },
    onError: (error) => {
      console.error('Erro na action:', error)
      toast.error('Ocorreu um erro inesperado ao criar a requisição.')
    },
  })

  // Observa o tipo pra renderizar campos condicionais
  const requestType = form.watch('type')

  function onSubmit(values: z.infer<typeof createRequestSchema>) {
    execute(values)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nova Requisição
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Criar nova requisição</DialogTitle>
          <DialogDescription>
            Preencha os detalhes abaixo para abrir uma nova requisição.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Linha 1: Nome e Tipo */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="requesterName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Requisitante</FormLabel>
                    <FormControl>
                      <Input {...field} disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Requisição</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(requestTypeOptions).map(([key, val]) => (
                          <SelectItem key={key} value={key}>
                            {val}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Título da requisição */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título da Requisição</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Compra de 2 mouses" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Campos condicionais */}
            {requestType === 'purchase' && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="productName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Produto</FormLabel>
                      <FormControl>
                        <Input placeholder="Mouse sem fio" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unitPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço Unitário (R$)</FormLabel>
                      <FormControl>
                        <Input type="text" placeholder="89.90" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {requestType === 'maintenance' && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="equipment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Equipamento/Ativo</FormLabel>
                      <FormControl>
                        <Input placeholder="Ar condicionado" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prioridade</FormLabel>
                      <Select onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a prioridade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(priorityOptions).map(
                            ([key, val]) => (
                              <SelectItem key={key} value={key}>
                                {val}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {requestType === 'it_ticket' && (
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria do Ticket</FormLabel>
                    <Select onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(itCategoryOptions).map(
                          ([key, val]) => (
                            <SelectItem key={key} value={key}>
                              {val}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Descrição */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detalhes adicionais sobre a requisição..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Botão de submit */}
            <Button
              type="submit"
              className="w-full"
              disabled={status === 'executing'}
            >
              {status === 'executing' ? 'A criar...' : 'Criar Requisição'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
