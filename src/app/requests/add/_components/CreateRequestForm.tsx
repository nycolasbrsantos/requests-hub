// src/app/(protected)/requests/add/_components/CreateRequestForm.tsx
'use client'

import { useSearchParams } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import * as z from 'zod'
import { NumericFormat } from 'react-number-format'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DriveUploadForm } from '../../_components/DriveUploadForm'

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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const MAX_FILES = 5;

const formSchema = z.object({
  productName: z.string().min(2, 'Informe o nome do produto.'),
  quantity: z.coerce.number().min(1, 'Quantidade deve ser maior que zero.'),
  unitPrice: z.string().min(1, 'Informe o preço unitário.'),
  supplier: z.string().min(2, 'Informe o fornecedor.'),
  description: z.string().min(5, 'Descreva a necessidade.'),
  priority: z.enum(['low', 'medium', 'high'], { required_error: 'Selecione a prioridade.' }),
  attachments: z.array(z.any()).max(MAX_FILES).optional(),
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
      attachments: [],
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

  async function onSubmit(values: FormValues) {
    // Cria a requisição normalmente
    await execute({ ...values, title: values.productName, type: defaultType, requesterName });
  }

  return (
    <Card className="max-w-xl mx-auto shadow-lg border-primary/20">
      <CardHeader>
        <CardTitle>Nova Requisição</CardTitle>
        <CardDescription>Preencha os campos abaixo para solicitar uma nova compra, manutenção ou ticket de T.I.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <Textarea placeholder="Descreva a necessidade da compra, manutenção ou ticket..." {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="pt-2 pb-4 border-t mt-4">
              <div className="font-medium mb-2">Anexos (opcional)</div>
              {/* Upload de anexos apenas via Google Drive */}
              <DriveUploadForm requestId={0} uploadedBy={requesterName} />
            </div>
            <Button type="submit" disabled={status === 'executing'} className="w-full h-12 text-base font-semibold">
              {status === 'executing' ? 'Enviando...' : 'Enviar Requisição'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
