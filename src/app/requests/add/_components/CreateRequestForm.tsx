// src/app/(protected)/requests/add/_components/CreateRequestForm.tsx
'use client'

import { useSearchParams } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import * as z from 'zod'
import { NumericFormat } from 'react-number-format'
import { Paperclip } from 'lucide-react'

import { createRequest } from '@/actions/create-request'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
];

const formSchema = z.object({
  productName: z.string().min(2, 'Informe o nome do produto.'),
  quantity: z.coerce.number().min(1, 'Quantidade deve ser maior que zero.'),
  unitPrice: z.string().min(1, 'Informe o preço unitário.'),
  supplier: z.string().min(2, 'Informe o fornecedor.'),
  description: z.string().min(5, 'Descreva a necessidade.'),
  priority: z.enum(['low', 'medium', 'high'], { required_error: 'Selecione a prioridade.' }),
  attachment: z
    .any()
    .refine(
      (file) =>
        !file ||
        (file instanceof File && ACCEPTED_FILE_TYPES.includes(file.type)),
      {
        message: 'Apenas PDF, PNG ou JPG são permitidos.',
      }
    )
    .optional(),
})

type FormValues = z.infer<typeof formSchema>

interface CreateRequestFormProps {
  requesterName: string;
}

export function CreateRequestForm({ requesterName }: CreateRequestFormProps) {
  // 1) Pega ?type= da URL e garante só esses três valores
  const params = useSearchParams()
  const tp = params.get('type')
  const defaultType: 'purchase' | 'maintenance' | 'it_ticket' =
    tp === 'maintenance' || tp === 'it_ticket' ? tp : 'purchase'

  // 2) Inicia o React-Hook-Form com Zod
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productName: '',
      quantity: 1,
      unitPrice: '',
      supplier: '',
      description: '',
      priority: 'medium',
      attachment: undefined,
    },
  })

  // 3) useAction sem genéricos, com callbacks tipados
  const { execute, status } = useAction(createRequest, {
    onSuccess: () => {
      toast.success('Requisição criada com sucesso!')
      form.reset()
    },
    onError: () => {
      toast.error('Erro ao criar requisição.')
    },
  })

  function onSubmit(values: FormValues) {
    execute({ ...values, title: values.productName, type: defaultType, requesterName })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="productName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Produto</FormLabel>
              <Input placeholder="Ex: Notebook Dell" {...field} />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantidade</FormLabel>
              <Input type="number" min={1} placeholder="0" {...field} />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="unitPrice"
          render={() => (
            <FormItem>
              <FormLabel>Preço Unitário</FormLabel>
              <Controller
                control={form.control}
                name="unitPrice"
                render={({ field }) => (
                  <NumericFormat
                    customInput={Input}
                    prefix="R$ "
                    decimalSeparator="," 
                    thousandSeparator="."
                    allowNegative={false}
                    value={field.value}
                    onValueChange={(values) => field.onChange(values.value)}
                    placeholder="0,00"
                  />
                )}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="supplier"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fornecedor</FormLabel>
              <Input placeholder="Ex: Dell Computadores" {...field} />
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <Textarea placeholder="Descreva a necessidade da compra..." {...field} />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="attachment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Anexo (PDF, PNG ou JPG)</FormLabel>
              <div className="flex items-center gap-2">
                <label htmlFor="file-upload" className="inline-flex items-center px-3 py-2 bg-muted border rounded cursor-pointer hover:bg-muted/80 transition">
                  <Paperclip className="w-4 h-4 mr-2" />
                  <span>Selecionar arquivo</span>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".pdf,image/png,image/jpeg"
                    className="hidden"
                    onChange={e => field.onChange(e.target.files?.[0])}
                  />
                </label>
                {field.value && (
                  <span className="truncate text-sm text-muted-foreground max-w-[180px]">{field.value.name}</span>
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={status === 'executing'}>
          {status === 'executing' ? 'Enviando...' : 'Enviar Requisição'}
        </Button>
      </form>
    </Form>
  )
}
