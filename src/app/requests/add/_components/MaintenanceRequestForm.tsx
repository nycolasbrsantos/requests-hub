"use client";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';
import * as z from 'zod';
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

const MAX_FILES = 5;

const maintenanceSchema = z.object({
  location: z.string().min(2, 'Informe o local.'),
  maintenanceType: z.string().min(2, 'Informe o tipo de manutenção.'),
  description: z.string().min(5, 'Descreva a necessidade.'),
  priority: z.enum(['low', 'medium', 'high'], { required_error: 'Selecione a prioridade.' }),
  attachments: z.array(z.any()).max(MAX_FILES).optional(),
});

type MaintenanceFormValues = z.infer<typeof maintenanceSchema>;

interface MaintenanceRequestFormProps {
  requesterName: string;
}

export function MaintenanceRequestForm({ requesterName }: MaintenanceRequestFormProps) {
  const form = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      location: '',
      maintenanceType: '',
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

  async function onSubmit(values: MaintenanceFormValues) {
    let attachments: { id: string; name: string; webViewLink?: string }[] = [];
    if (Array.isArray(values.attachments) && values.attachments.length > 0) {
      setUploading(true);
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
    }
    await execute({
      ...values,
      title: `${values.maintenanceType} - ${values.location}`,
      type: 'maintenance',
      requesterName,
      attachments,
    });
  }

  return (
    <Card className="max-w-xl mx-auto shadow-lg border-primary/20">
      <CardHeader>
        <CardTitle>Nova Requisição de Manutenção Predial</CardTitle>
        <CardDescription>Preencha os campos abaixo para solicitar uma manutenção na infraestrutura.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="location">Local</FormLabel>
                    <Input id="location" placeholder="Ex: Sala 101" {...field} />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maintenanceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="maintenanceType">Tipo de Manutenção</FormLabel>
                    <Input id="maintenanceType" placeholder="Ex: Elétrica, Hidráulica..." {...field} />
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
                  <Textarea id="description" placeholder="Descreva a necessidade da manutenção..." rows={3} {...field} />
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