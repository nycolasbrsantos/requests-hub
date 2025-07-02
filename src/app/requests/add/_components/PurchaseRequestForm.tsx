"use client";
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';
import * as z from 'zod';
import { NumericFormat } from 'react-number-format';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect, useRef } from 'react';
import { Loader2, ShoppingBag, Hash, DollarSign, Building2, Flag, UploadCloud, Send } from 'lucide-react';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export function PurchaseRequestForm({ requesterName, setIsLoading }: PurchaseRequestFormProps) {
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
      setIsLoading(false);
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
      setIsLoading(false);
    },
  });

  const [attachmentsPreview, setAttachmentsPreview] = useState<File[]>([]);
  const loadingToastId = useRef<string | number | null>(null);

  // Bloqueio de navegação (Next.js e browser)
  useEffect(() => {
    const handleWindowClose = (e: BeforeUnloadEvent) => {
      if (form.formState.isSubmitting) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', handleWindowClose);
    return () => window.removeEventListener('beforeunload', handleWindowClose);
  }, [form.formState.isSubmitting]);

  // Bloqueio de navegação interna (Next.js App Router)
  useEffect(() => {
    if (!form.formState.isSubmitting) return;
    const handler = (e: PopStateEvent) => {
      e.preventDefault();
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [form.formState.isSubmitting]);

  // Toast de loading
  useEffect(() => {
    if (form.formState.isSubmitting && !loadingToastId.current) {
      loadingToastId.current = toast.loading('Enviando requisição, aguarde...');
    }
    if (!form.formState.isSubmitting && loadingToastId.current) {
      toast.dismiss(loadingToastId.current);
      loadingToastId.current = null;
    }
  }, [form.formState.isSubmitting]);

  async function onSubmit(values: PurchaseFormValues) {
    setIsLoading(true);
    await execute({
      ...values,
      title: values.productName,
      type: 'purchase',
      requesterName,
      attachments: attachmentsPreview,
    });
    form.reset();
    setAttachmentsPreview([]);
  }

  return (
    <div className="relative">
      <Card className="max-w-xl mx-auto shadow-lg border-primary/20 rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold text-primary flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-primary" /> Nova Requisição de Compras
          </CardTitle>
          <CardDescription className="text-muted-foreground mt-1">Preencha os campos abaixo para solicitar uma nova compra.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0 pb-8 px-4 sm:px-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Agrupamento Produto/Quantidade/Preço */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="productName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="productName">Produto</FormLabel>
                      <div className="relative">
                        <ShoppingBag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="productName" placeholder="Ex: Notebook Dell" {...field} className="pl-10" />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="quantity">Qtd.</FormLabel>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="quantity" type="number" min={1} placeholder="0" {...field} className="pl-10" />
                      </div>
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
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <NumericFormat
                          id="unitPrice"
                          className="pl-10 input"
                          thousandSeparator
                          prefix="R$ "
                          decimalScale={2}
                          fixedDecimalScale
                          customInput={Input}
                          value={form.getValues('unitPrice')}
                          onValueChange={(values) => form.setValue('unitPrice', values.value)}
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {/* Fornecedor e Prioridade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="supplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="supplier">Fornecedor</FormLabel>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="supplier" placeholder="Ex: Dell Computadores" {...field} className="pl-10" />
                      </div>
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
                      <div className="relative">
                        <Flag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger id="priority" className="pl-10">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Baixa</SelectItem>
                            <SelectItem value="medium">Média</SelectItem>
                            <SelectItem value="high">Alta</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {/* Descrição */}
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
              {/* Anexos com dropzone visual */}
              <FormField
                control={form.control}
                name="attachments"
                render={() => (
                  <FormItem>
                    <FormLabel htmlFor="attachments">Anexos</FormLabel>
                    <div
                      className={`
                        relative flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-6 px-4 transition-colors
                        ${form.formState.isSubmitting ? 'bg-muted/60 cursor-not-allowed' : 'bg-muted/40 hover:bg-blue-50 hover:border-primary/60 cursor-pointer'}
                      `}
                      onDragOver={e => {
                        e.preventDefault();
                        if (!form.formState.isSubmitting) e.currentTarget.classList.add('border-primary');
                      }}
                      onDragLeave={e => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('border-primary');
                      }}
                      onDrop={e => {
                        e.preventDefault();
                        if (form.formState.isSubmitting) return;
                        const files = Array.from(e.dataTransfer.files || []);
                        if (files.length + attachmentsPreview.length > 5) {
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
                        const newFiles = [...attachmentsPreview, ...files].slice(0, 5);
                        setAttachmentsPreview(newFiles);
                        form.setValue('attachments', newFiles);
                      }}
                    >
                      <UploadCloud className="w-10 h-10 text-primary mb-2" />
                      <span className="text-sm text-muted-foreground text-center">Arraste e solte arquivos PDF/JPEG aqui ou clique para selecionar (máx. 5 arquivos, até 5MB cada)</span>
                      <Input
                        id="attachments"
                        type="file"
                        multiple
                        accept="application/pdf,image/jpeg"
                        disabled={form.formState.isSubmitting}
                        onChange={e => {
                          const files = Array.from(e.target.files || []);
                          if (files.length + attachmentsPreview.length > 5) {
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
                          const newFiles = [...attachmentsPreview, ...files].slice(0, 5);
                          setAttachmentsPreview(newFiles);
                          form.setValue('attachments', newFiles);
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        style={{ zIndex: 2 }}
                      />
                    </div>
                    {attachmentsPreview.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {attachmentsPreview.map((file, idx) => (
                          <div key={idx} className="flex items-center gap-1 bg-blue-50 border border-blue-200 px-2 py-1 rounded text-xs shadow-sm">
                            <span className="truncate max-w-[120px]" title={file.name}>{file.name}</span>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Botão de submit com tooltip e animação */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="submit" disabled={form.formState.isSubmitting} size="lg" className="w-full gap-2 text-base font-semibold shadow-md">
                      {form.formState.isSubmitting ? (
                        <Loader2 className="animate-spin mr-2 h-5 w-5" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                      {form.formState.isSubmitting ? 'Enviando...' : 'Criar Requisição'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Enviar requisição para aprovação</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
} 