"use client";
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';
import * as z from 'zod';
import { NumericFormat } from 'react-number-format';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { createRequest } from '@/actions/create-request';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const MAX_FILES = 5;

const purchaseSchema = z.object({
  productName: z.string().min(2, 'Informe o nome do produto.'),
  quantity: z.coerce.number().min(1, 'Quantidade deve ser maior que zero.'),
  unitPrice: z.string().min(1, 'Informe o preço unitário.'),
  supplier: z.string().min(2, 'Informe o fornecedor.'),
  description: z.string().min(5, 'Descreva a necessidade.'),
  priority: z.enum(['low', 'medium', 'high'], { required_error: 'Selecione a prioridade.' }),
  attachments: z.array(z.any()).max(MAX_FILES).optional(),
});

type PurchaseFormValues = z.infer<typeof purchaseSchema>;

interface PurchaseRequestFormProps {
  requesterName: string;
}

export function PurchaseRequestForm({ requesterName }: PurchaseRequestFormProps) {
  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      productName: '',
      quantity: 1,
      unitPrice: '',
      supplier: '',
      description: '',
      priority: 'medium',
      attachments: [],
    },
  });

  const { execute } = useAction(createRequest, {
    onSuccess: async (result) => {
      if (result?.data && result.data.id && form) {
        const attachments = form.getValues('attachments') || [];
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
        setAttachmentsPreview([]);
      } else if (!result?.data?.id) {
        toast.error('Erro ao criar requisição: ID não retornado.');
      } else {
        toast.success('Requisição criada com sucesso!');
        form.reset();
        setAttachmentsPreview([]);
      }
    },
    onError: (error) => {
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
  });

  const [uploading, setUploading] = useState(false);
  const [attachmentsPreview, setAttachmentsPreview] = useState<File[]>([]);

  async function onSubmit(values: PurchaseFormValues) {
    // 1. Cria a requisição sem anexos
    const result = await execute({
      ...values,
      title: values.productName,
      type: 'purchase',
      requesterName,
      attachments: [],
    });
    if (!result?.data?.id || !result?.data?.driveFolderId) {
      toast.error('Erro ao criar requisição ou obter pasta de anexos.');
      return;
    }
    // 2. Se houver anexos, faz upload para a subpasta correta
    let attachments: { id: string; name: string; webViewLink?: string }[] = [];
    if (attachmentsPreview.length > 0) {
      setUploading(true);
      const formData = new FormData();
      attachmentsPreview.forEach((file: File) => formData.append('files', file));
      formData.append('driveFolderId', result.data.driveFolderId);
      try {
        const res = await fetch('/api/upload/upload-temp', {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          throw new Error('Falha ao enviar anexos.');
        }
        const uploaded = await res.json();
        if (!Array.isArray(uploaded)) {
          throw new Error('Resposta inesperada do upload.');
        }
        attachments = uploaded;
      } catch (e: unknown) {
        let errorMsg = 'Erro ao fazer upload dos anexos.';
        if (e instanceof Error) errorMsg = e.message;
        toast.error(errorMsg);
        setUploading(false);
        return;
      }
      setUploading(false);
      // 3. Atualiza os attachments da requisição
      await fetch(`/api/requests/${result.data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachments }),
      });
    }
    toast.success('Requisição criada com sucesso!');
    form.reset();
    setAttachmentsPreview([]);
  }

  return (
    <Card className="max-w-xl mx-auto shadow-lg border-primary/20">
      <CardHeader>
        <CardTitle>Nova Requisição de Compras</CardTitle>
        <CardDescription>Preencha os campos abaixo para solicitar uma nova compra.</CardDescription>
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
                    <Input id="productName" placeholder="Ex: Notebook Dell" {...field} />
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
                    <NumericFormat
                      id="unitPrice"
                      className="input"
                      thousandSeparator
                      prefix="R$ "
                      decimalScale={2}
                      fixedDecimalScale
                      customInput={Input}
                      value={form.getValues('unitPrice')}
                      onValueChange={(values) => form.setValue('unitPrice', values.value)}
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
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="priority">
                        <SelectValue placeholder="Selecione" />
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
                  <Textarea id="description" placeholder="Descreva a necessidade da compra..." rows={3} {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="attachments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="attachments">Anexos</FormLabel>
                  <Input
                    id="attachments"
                    type="file"
                    multiple
                    accept="application/pdf,image/jpeg"
                    disabled={uploading || form.formState.isSubmitting}
                    onChange={e => {
                      const files = Array.from(e.target.files || []);
                      if (files.length > 5) {
                        toast.error('Você pode anexar no máximo 5 arquivos.');
                        return;
                      }
                      for (const file of files) {
                        if (file.size > 5 * 1024 * 1024) {
                          toast.error(`O arquivo "${file.name}" excede 5MB.`);
                          return;
                        }
                        if (!['application/pdf', 'image/jpeg'].includes(file.type)) {
                          toast.error(`O arquivo "${file.name}" não é PDF ou JPEG.`);
                          return;
                        }
                      }
                      field.onChange(files);
                      setAttachmentsPreview(files);
                    }}
                  />
                  <FormMessage />
                  {attachmentsPreview.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {attachmentsPreview.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-xs">
                          {file.name}
                          <button
                            type="button"
                            aria-label={`Remover anexo ${file.name}`}
                            className="ml-1 text-red-500 hover:text-red-700"
                            onClick={() => {
                              const newFiles = attachmentsPreview.filter((_, i) => i !== idx);
                              setAttachmentsPreview(newFiles);
                              form.setValue('attachments', newFiles);
                            }}
                          >
                            Remover
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {uploading && (
                    <div className="flex items-center gap-2 mt-2 text-primary text-xs">
                      <Loader2 className="w-4 h-4 animate-spin" /> Enviando anexos...
                    </div>
                  )}
                </FormItem>
              )}
            />
            <Button type="submit" disabled={form.formState.isSubmitting || uploading} className="w-full">
              {form.formState.isSubmitting || uploading ? (
                <Loader2 className="animate-spin mr-2 h-4 w-4 inline" />
              ) : null}
              Criar Requisição
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
} 