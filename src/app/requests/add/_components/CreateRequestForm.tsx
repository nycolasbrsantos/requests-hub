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
    onSuccess: async (result) => {
      console.log('onSuccess result:', result);
      if (result?.data && result.data.id && form) {
        const attachments = form.getValues("attachments") || [];
        if (Array.isArray(attachments) && attachments.length > 0) {
          const formData = new FormData();
          attachments.forEach((file: File) => formData.append('files', file));
          await fetch(`/api/requests/${result.data.id}/attachments`, {
            method: 'POST',
            body: formData,
          });
        }
        toast.success('Requisição criada com sucesso!');
        form.reset();
      } else if (!result?.data?.id) {
        toast.error('Erro ao criar requisição: ID não retornado.');
      } else {
        toast.success('Requisição criada com sucesso!');
        form.reset();
      }
    },
    onError: (error) => {
      console.error('Erro na action:', error);
      // Tenta extrair mensagem de validação do Zod
      const validation = error?.error?.validationErrors;
      const serverError = error?.error?.serverError || error?.error;
      let msg = '';
      function hasErrors(obj: unknown): obj is { _errors: string[] } {
        return !!obj && typeof obj === 'object' && '_errors' in obj && Array.isArray((obj as { _errors?: unknown })._errors);
      }
      if (validation) {
        msg = Object.values(validation)
          .map((v) => hasErrors(v) ? v._errors.join(', ') : undefined)
          .filter(Boolean)
          .join(' | ');
      } else if (serverError) {
        msg = typeof serverError === 'string' ? serverError : JSON.stringify(serverError);
      } else {
        msg = JSON.stringify(error);
      }
      toast.error('Erro ao criar requisição: ' + msg);
    },
  })

  async function onSubmit(values: FormValues) {
    let attachments: { id: string; name: string; webViewLink?: string }[] = [];
    if (Array.isArray(values.attachments) && values.attachments.length > 0) {
      // 1. Upload dos arquivos para o Drive antes de criar a requisição
      const formData = new FormData();
      values.attachments.forEach((file: File) => formData.append('files', file));
      try {
        const res = await fetch('/api/upload/upload-temp', {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          throw new Error('Falha ao enviar anexos.');
        }
        // Espera que o backend retorne um array de objetos { id, name, webViewLink }
        const uploaded = await res.json();
        if (!Array.isArray(uploaded)) {
          throw new Error('Resposta inesperada do upload.');
        }
        attachments = uploaded;
      } catch (e: unknown) {
        let errorMsg = 'Erro ao fazer upload dos anexos.';
        if (e instanceof Error) errorMsg = e.message;
        toast.error(errorMsg);
        return;
      }
    }
    await execute({
      ...values,
      title: values.productName,
      type: defaultType,
      requesterName,
      attachments,
    });
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
              <FormLabel htmlFor="productName">Produto</FormLabel>
              <Input id="productName" {...field} />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="quantity">Quantidade</FormLabel>
              <Input id="quantity" type="number" min={1} placeholder="0" {...field} />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="unitPrice"
          render={() => (
            <FormItem>
              <FormLabel htmlFor="unitPrice">Preço Unitário</FormLabel>
              <Controller
                control={form.control}
                name="unitPrice"
                render={({ field }) => (
                  <NumericFormat
                    customInput={Input}
                    id="unitPrice"
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
              <FormLabel htmlFor="supplier">Fornecedor</FormLabel>
              <Input id="supplier" placeholder="Ex: Dell Computadores" {...field} />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="priority">Prioridade</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger id="priority">
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
              <FormLabel htmlFor="description">Descrição</FormLabel>
              <Textarea id="description" placeholder="Descreva a necessidade da compra, manutenção ou ticket..." {...field} />
              <FormMessage />
            </FormItem>
          )}
        />
            <div className="pt-2 pb-4 border-t mt-4">
              <div className="font-medium mb-2">Anexos (opcional)</div>
              <FormField
                control={form.control}
                name="attachments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="attachments">Adicionar Anexos</FormLabel>
                    <Input
                      id="attachments"
                      type="file"
                      multiple
                      onChange={e => field.onChange(Array.from(e.target.files || []))}
                      className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <div className="text-xs text-muted-foreground mt-1">Selecione um ou mais arquivos para anexar à requisição.</div>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
