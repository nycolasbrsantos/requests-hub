'use client'

// Este componente ainda não vai funcionar para criar,
// pois não criamos a "Server Action". Faremos isso no próximo passo.
// Por agora, ele serve para montar a UI.

import { zodResolver } from '@hookform/resolvers/zod'
import { PlusCircle } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

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
import { toast } from 'sonner'

// Schema de validação com Zod
const createRequestSchema = z.object({
  title: z.string().min(3, { message: 'Título é obrigatório.' }),
})

export function CreateRequestDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const form = useForm<z.infer<typeof createRequestSchema>>({
    resolver: zodResolver(createRequestSchema),
    defaultValues: {
      title: '',
    },
  })

  // Função de envio (placeholder por enquanto)
  function onSubmit(values: z.infer<typeof createRequestSchema>) {
    console.log(values)
    toast.info('Funcionalidade de criação será implementada em breve!')
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nova Requisição
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Criar nova requisição</DialogTitle>
          <DialogDescription>
            Preencha os detalhes para abrir uma nova requisição.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Compra de 5 cadeiras" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Criar</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
