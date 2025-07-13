"use client";
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect, useRef } from 'react';
import { Loader2, ShoppingBag, Hash, DollarSign, Building2, Flag, UploadCloud, Send, X, Info } from 'lucide-react';
import { createRequest } from '@/actions/create-request';
import { createRequestSchema } from '@/actions/create-request/schema';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';

// Substituir o schema local pelo do backend
// const purchaseSchema = z.object({ ... });
// type PurchaseFormValues = z.infer<typeof purchaseSchema>;
type PurchaseFormValues = z.infer<typeof createRequestSchema>;

interface PurchaseRequestFormProps {
  requesterName: string;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export function PurchaseRequestForm({ requesterName, setIsLoading }: PurchaseRequestFormProps) {
  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(createRequestSchema),
    defaultValues: {
      type: 'purchase',
      requesterName: requesterName || '',
      productName: '',
      quantity: 1,
      unitPriceInCents: 0,
      supplier: '',
      description: '',
      priority: 'medium',
      attachments: [],
      // Não enviar title
    },
  });
  // Remover todos os vestígios de array de produtos e usar apenas os campos simples do schema do backend
  // Substituir o useFieldArray e fields por campos simples
  // Renderização dos campos:
  // const { fields, append, remove } = useFieldArray({
  //   control: form.control,
  //   name: 'products',
  // });

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
        toast.success('Request created successfully!');
        form.reset();
        setAttachmentsPreview([]);
      } else if (!result?.data?.id) {
        toast.error('Error creating request: ID not returned.');
      } else {
        toast.success('Request created successfully!');
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
      toast.error('Error creating request: ' + msg);
      setIsLoading(false);
    },
  });

  const [attachmentsPreview, setAttachmentsPreview] = useState<File[]>([]);
  const loadingToastId = useRef<string | number | null>(null);
  const [isLoadingSkeleton, setIsLoadingSkeleton] = useState(true);

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
      loadingToastId.current = toast.loading('Sending request, please wait...');
    }
    if (!form.formState.isSubmitting && loadingToastId.current) {
      toast.dismiss(loadingToastId.current);
      loadingToastId.current = null;
    }
  }, [form.formState.isSubmitting]);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoadingSkeleton(false), 900);
    return () => clearTimeout(timer);
  }, []);

  // Função utilitária para cor da bandeira
  function getFlagColor(priority: string) {
    if (priority === 'low') return 'text-green-600';
    if (priority === 'medium') return 'text-yellow-500';
    if (priority === 'high') return 'text-red-600';
    return 'text-muted-foreground';
  }

  async function onSubmit(values: PurchaseFormValues) {
    setIsLoading(true);
    
    // Pegar o primeiro produto (ou fazer merge se houver múltiplos)
    // const firstProduct = values.products[0]; // This line is no longer needed
    
    await execute({
      ...values,
      type: 'purchase',
      requesterName: requesterName || '',
      // Não enviar title
      title: undefined,
      unitPriceInCents: values.unitPriceInCents ? Number(values.unitPriceInCents) : 0,
      quantity: values.quantity ? Number(values.quantity) : 1,
      attachments: attachmentsPreview,
    });
    form.reset();
    setAttachmentsPreview([]);
  }

  if (isLoadingSkeleton) {
    return (
      <div className="relative">
        <Card className="max-w-5xl mx-auto shadow-lg border-primary/20 rounded-2xl">
          <div className="pt-6" />
          <CardContent className="pt-0 pb-8 px-2 sm:px-10 space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative">
      <Card className="max-w-5xl mx-auto shadow-lg border-primary/20 rounded-2xl">
        <CardContent className="pt-0 pb-8 px-2 sm:px-10">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Seleção de tipo de requisição */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Request type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select the type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="purchase">Product/Equipment</SelectItem>
                        <SelectItem value="service">Service</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              {/* Campos específicos conforme o tipo */}
              {form.watch('type') === 'purchase' && (
                <>
                  <FormField
                    control={form.control}
                    name="productName"
                    render={({ field }) => (
                      <FormItem className="relative w-full">
                        <FormLabel htmlFor="productName" className={form.formState.errors.productName ? 'text-destructive' : ''}>Product/Equipment</FormLabel>
                        <div className="relative">
                          <ShoppingBag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input id="productName" placeholder="e.g. HP Printer" {...field} className="pl-10 w-full text-base" />
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem className="relative w-full">
                        <FormLabel htmlFor="quantity" className={form.formState.errors.quantity ? 'text-destructive' : ''}>Quantity</FormLabel>
                        <div className="relative">
                          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input id="quantity" type="number" min={1} placeholder="0" {...field} className="pl-10 w-full text-base" />
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="unitPriceInCents"
                    render={({ field }) => (
                      <FormItem className="relative w-full">
                        <FormLabel htmlFor="unitPriceInCents" className={form.formState.errors.unitPriceInCents ? 'text-destructive' : ''}>Unit price (cents)</FormLabel>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input id="unitPriceInCents" type="number" min={1} placeholder="0" {...field} className="pl-10 w-full text-base" />
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="supplier"
                    render={({ field }) => (
                      <FormItem className="relative w-full">
                        <FormLabel htmlFor="supplier" className={form.formState.errors.supplier ? 'text-destructive' : ''}>Supplier</FormLabel>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input id="supplier" placeholder="e.g. Amazon" {...field} className="pl-10 w-full text-base" />
                        </div>
                      </FormItem>
                    )}
                  />
                </>
              )}
              {form.watch('type') === 'service' && (
                <>
                  <FormField
                    control={form.control}
                    name="serviceDescription"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>Service description</FormLabel>
                        <Textarea {...field} placeholder="Describe the service to be performed..." />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>Provider company</FormLabel>
                        <Input {...field} placeholder="Company name" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="scheduledDate"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>Scheduled date</FormLabel>
                        <Input {...field} type="date" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="technicalResponsible"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>Technical responsible</FormLabel>
                        <Input {...field} placeholder="Name of the responsible person" />
                      </FormItem>
                    )}
                  />
                </>
              )}
              {/* Prioridade, descrição, anexos e botão de submit permanecem iguais */}
              {/* Prioridade */}
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <div className="flex items-center gap-2 mb-1">
                      <FormLabel htmlFor="priority" className={form.formState.errors.priority ? 'text-destructive' : ''}>Priority</FormLabel>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-4 h-4 text-muted-foreground cursor-pointer ml-1" aria-label="Help about priority" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs text-sm">
                            Set the priority of the request to help with fulfillment. High = urgent.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="relative">
                      <Flag className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${getFlagColor(field.value)}`} />
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="priority" className="pl-10 w-full text-base transition-all focus:ring-2 focus:ring-primary">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">
                            <span className="text-green-600 font-medium">Low</span>
                          </SelectItem>
                          <SelectItem value="medium">
                            <span className="text-yellow-500 font-medium">Medium</span>
                          </SelectItem>
                          <SelectItem value="high">
                            <span className="text-red-600 font-medium">High</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </FormItem>
                )}
              />
              {/* Descrição */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel htmlFor="description" className={form.formState.errors.description ? 'text-destructive' : ''}>Description</FormLabel>
                    <Textarea id="description" placeholder="Describe the need for the request..." rows={3} {...field} className="w-full text-base" />
                  </FormItem>
                )}
              />
              {/* Anexos com dropzone visual e badge de quantidade */}
              <FormField
                control={form.control}
                name="attachments"
                render={() => (
                  <FormItem className="w-full">
                    <div className="flex items-center gap-2 mb-1">
                      <FormLabel htmlFor="attachments" className={form.formState.errors.attachments ? 'text-destructive' : ''}>Attachments</FormLabel>
                      {attachmentsPreview.length > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 animate-fade-in">
                          {attachmentsPreview.length}
                        </span>
                      )}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-4 h-4 text-muted-foreground cursor-pointer ml-1" aria-label="Help about attachments" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs text-sm">
                            You can attach up to 5 PDF or JPEG files, each with a maximum of 5MB. Drag and drop or click below.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div
                      className={`
                        relative flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-6 px-2 sm:px-4 transition-colors duration-200
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
                          toast.error('You can attach a maximum of 5 files.');
                          return;
                        }
                        for (const file of files) {
                          if (file.size > 5 * 1024 * 1024) {
                            toast.error(`The file "${file.name}" exceeds 5MB.`);
                            return;
                          }
                          if (!['application/pdf', 'image/jpeg'].includes(file.type)) {
                            toast.error(`The file "${file.name}" is not a PDF or JPEG.`);
                            return;
                          }
                        }
                        const newFiles = [...attachmentsPreview, ...files].slice(0, 5);
                        setAttachmentsPreview(newFiles);
                        form.setValue('attachments', newFiles);
                      }}
                    >
                      <UploadCloud className="w-10 h-10 text-primary mb-2 transition-transform duration-200 group-hover:scale-110" />
                      <span className="text-sm text-muted-foreground text-center select-none">Drag and drop PDF/JPEG files here or click to select</span>
                      <Input
                        id="attachments"
                        type="file"
                        multiple
                        accept="application/pdf,image/jpeg"
                        disabled={form.formState.isSubmitting}
                        onChange={e => {
                          const files = Array.from(e.target.files || []);
                          if (files.length + attachmentsPreview.length > 5) {
                            toast.error('You can attach a maximum of 5 files.');
                            return;
                          }
                          for (const file of files) {
                            if (file.size > 5 * 1024 * 1024) {
                              toast.error(`The file "${file.name}" exceeds 5MB.`);
                              return;
                            }
                            if (!['application/pdf', 'image/jpeg'].includes(file.type)) {
                              toast.error(`The file "${file.name}" is not a PDF or JPEG.`);
                              return;
                            }
                          }
                          const newFiles = [...attachmentsPreview, ...files].slice(0, 5);
                          setAttachmentsPreview(newFiles);
                          form.setValue('attachments', newFiles);
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        style={{ zIndex: 2 }}
                        aria-label="Select files to attach"
                      />
                    </div>
                    {attachmentsPreview.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {attachmentsPreview.map((file, idx) => (
                          <div key={idx} className="flex items-center gap-1 bg-blue-50 border border-blue-200 px-2 py-1 rounded text-xs shadow-sm animate-fade-in">
                            <span className="truncate max-w-[120px]" title={file.name}>{file.name}</span>
                            <button
                              type="button"
                              aria-label={`Remove attachment ${file.name}`}
                              className="ml-1 text-red-500 hover:text-red-700 transition-colors duration-150 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-red-400"
                              onClick={() => {
                                const newFiles = attachmentsPreview.filter((_, i) => i !== idx);
                                setAttachmentsPreview(newFiles);
                                form.setValue('attachments', newFiles);
                              }}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </FormItem>
                )}
              />
              {/* Botão de submit com tooltip e animação */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="submit" disabled={form.formState.isSubmitting} size="lg" className="w-full gap-2 text-base font-semibold shadow-md py-4 transition-all duration-150 hover:scale-[1.02] active:scale-95 focus:ring-2 focus:ring-primary">
                      {form.formState.isSubmitting ? (
                        <Loader2 className="animate-spin mr-2 h-5 w-5" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                      {form.formState.isSubmitting ? 'Sending...' : 'Send Request'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Send request for approval</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
} 