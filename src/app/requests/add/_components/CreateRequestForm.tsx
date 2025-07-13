"use client"

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createRequestSchema } from "@/actions/create-request/schema";
import { createRequest } from "@/actions/create-request";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const REQUEST_TYPES = [
  { value: "product", label: "Produto" },
  { value: "service", label: "Serviço" },
] as const;

interface CreateRequestFormProps {
  requesterName: string;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export function CreateRequestForm({ requesterName, isLoading, setIsLoading }: CreateRequestFormProps) {
  const [attachmentsPreview, setAttachmentsPreview] = useState<File[]>([]);
  const [budgetsPreview, setBudgetsPreview] = useState<File[]>([]);
  const loadingToastId = useRef<string | number | null>(null);
  const [isLoadingSkeleton, setIsLoadingSkeleton] = useState(true);

  const form = useForm<z.infer<typeof createRequestSchema>>({
    resolver: zodResolver(createRequestSchema),
    defaultValues: {
      type: undefined,
      requesterName: requesterName || "",
      title: "",
      description: "",
      priority: "medium",
      attachments: [],
      productName: "",
      quantity: undefined,
      unitPriceInCents: undefined,
      supplier: "",
      serviceDescription: "",
      company: "",
      scheduledDate: "",
      technicalResponsible: "",
      budgets: [],
    },
  });

  // Loading skeleton effect
  useEffect(() => {
    const timer = setTimeout(() => setIsLoadingSkeleton(false), 900);
    return () => clearTimeout(timer);
  }, []);

  // Toast de loading
  useEffect(() => {
    if (form.formState.isSubmitting && !loadingToastId.current) {
      loadingToastId.current = toast.loading("Enviando requisição, aguarde...");
    }
    if (!form.formState.isSubmitting && loadingToastId.current) {
      toast.dismiss(loadingToastId.current);
      loadingToastId.current = null;
    }
  }, [form.formState.isSubmitting]);

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

  async function onSubmit(values: z.infer<typeof createRequestSchema>) {
    setIsLoading(true);
    try {
      await createRequest({
        ...values,
        requesterName: requesterName || "",
        attachments: attachmentsPreview,
        budgets: values.type === "service" ? budgetsPreview : [],
      });
      toast.success("Requisição criada com sucesso!");
      form.reset();
      setAttachmentsPreview([]);
      setBudgetsPreview([]);
    } catch (error) {
      const errMsg = (error instanceof Error) ? error.message : String(error);
      toast.error("Erro ao criar requisição: " + errMsg);
    }
    setIsLoading(false);
  }

  // Renderização condicional dos campos
  const type = form.watch("type");

  if (isLoadingSkeleton) {
    return (
      <div className="relative">
        <Card className="max-w-5xl mx-auto shadow-lg border-primary/20 rounded-2xl">
          <div className="pt-6" />
          <CardContent className="pt-0 pb-8 px-2 sm:px-10 space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="h-12 w-full bg-gray-200 animate-pulse rounded" />
              <div className="h-12 w-full bg-gray-200 animate-pulse rounded" />
            </div>
            <div className="h-12 w-full bg-gray-200 animate-pulse rounded" />
            <div className="h-24 w-full bg-gray-200 animate-pulse rounded" />
            <div className="h-20 w-full rounded-xl bg-gray-200 animate-pulse" />
            <div className="h-12 w-full rounded-lg bg-gray-200 animate-pulse" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de requisição</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {REQUEST_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Título da requisição" disabled={isLoading} />
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
              <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
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
        {type === "product" && (
          <>
            <FormField
              control={form.control}
              name="productName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do produto</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: Impressora HP" disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} placeholder="1" disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unitPriceInCents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor unitário (centavos)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} placeholder="Ex: 10000" disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="supplier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fornecedor</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: Papelaria Central" disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
        {type === "service" && (
          <>
            <FormField
              control={form.control}
              name="serviceDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição do serviço</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Descreva o serviço a ser executado" disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Empresa executora</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: Manutenções ABC Ltda" disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="scheduledDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data prevista de execução</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="technicalResponsible"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsável técnico (opcional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nome do responsável técnico" disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Upload de orçamentos */}
            <div>
              <label className="block text-sm font-medium mb-1">Orçamentos (PDF, até 5 arquivos)</label>
              <input
                type="file"
                accept="application/pdf"
                multiple
                disabled={isLoading}
                onChange={e => {
                  const files = Array.from(e.target.files || []).slice(0, 5);
                  setBudgetsPreview(files as File[]);
                }}
                className="block w-full text-sm border rounded p-2"
              />
              {budgetsPreview.length > 0 && (
                <ul className="mt-2 text-xs text-muted-foreground">
                  {budgetsPreview.map((file, idx) => (
                    <li key={idx}>{file.name}</li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
        {/* Campo comum: descrição */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição detalhada (opcional)</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Detalhe a necessidade, contexto ou observações" disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Upload de anexos */}
        <div>
          <label className="block text-sm font-medium mb-1">Anexos (PDF, imagens, até 5 arquivos)</label>
          <input
            type="file"
            accept="application/pdf,image/*"
            multiple
            disabled={isLoading}
            onChange={e => {
              const files = Array.from(e.target.files || []).slice(0, 5);
              setAttachmentsPreview(files as File[]);
            }}
            className="block w-full text-sm border rounded p-2"
          />
          {attachmentsPreview.length > 0 && (
            <ul className="mt-2 text-xs text-muted-foreground">
              {attachmentsPreview.map((file, idx) => (
                <li key={idx}>{file.name}</li>
              ))}
            </ul>
          )}
        </div>
        <Button type="submit" disabled={isLoading || form.formState.isSubmitting} className="w-full">
          {isLoading ? "Enviando..." : "Criar requisição"}
        </Button>
      </form>
    </Form>
  );
}
