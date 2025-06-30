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
import { useRef, useState } from 'react'
import { Progress } from '@/components/ui/progress'

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

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);

  async function uploadFile(file: File, onProgress?: (percent: number) => void): Promise<string | null> {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);
      xhr.open('POST', '/api/upload');
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
      xhr.onload = () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          resolve(data.filename);
        } else {
          resolve(null);
        }
      };
      xhr.onerror = () => resolve(null);
      xhr.send(formData);
    });
  }

  async function onSubmit(values: FormValues) {
    setIsUploading(true);
    setUploadProgress(0);
    const attachmentNames: string[] = [];
    if (values.attachments && values.attachments.length > 0) {
      if (values.attachments.length > MAX_FILES) {
        toast.error('Você pode anexar no máximo 5 arquivos.');
        setIsUploading(false);
        return;
      }
      for (const file of values.attachments) {
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`O arquivo ${file.name} excede 10MB.`);
          setIsUploading(false);
          return;
        }
        const name = await uploadFile(file, (percent) => setUploadProgress(percent));
        if (!name) {
          toast.error(`Falha ao enviar o arquivo ${file.name}.`);
          setIsUploading(false);
          return;
        }
        attachmentNames.push(name);
      }
    }
    execute({ ...values, title: values.productName, type: defaultType, requesterName, attachments: attachmentNames });
    setIsUploading(false);
    setUploadProgress(0);
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
          name="attachments"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Anexos (até 5 arquivos PDF, PNG ou JPG, cada um até 10MB)</FormLabel>
              <div
                className={
                  `flex flex-col gap-2 border-2 rounded-md p-4 transition-colors ${dragActive ? 'border-primary bg-primary/10' : 'border-muted'}`
                }
                onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={e => { e.preventDefault(); setDragActive(false); }}
                onDrop={e => {
                  e.preventDefault();
                  setDragActive(false);
                  const files = Array.from(e.dataTransfer.files ?? []);
                  const current = field.value || [];
                  const all = [...current, ...files].slice(0, MAX_FILES);
                  field.onChange(all);
                }}
              >
                <label htmlFor="file-upload" className="inline-flex items-center px-3 py-2 bg-muted border rounded cursor-pointer hover:bg-muted/80 transition w-fit">
                  <Paperclip className="w-4 h-4 mr-2" />
                  <span>Selecionar arquivos</span>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".pdf,image/png,image/jpeg"
                    className="hidden"
                    multiple
                    ref={fileInputRef}
                    onChange={e => {
                      const files = Array.from(e.target.files ?? []);
                      const current = field.value || [];
                      const all = [...current, ...files].slice(0, MAX_FILES);
                      field.onChange(all);
                    }}
                    disabled={isUploading}
                  />
                </label>
                <span className="text-xs text-muted-foreground mt-1">Ou arraste e solte arquivos aqui</span>
                {field.value && field.value.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {field.value.map((f: File, idx: number) => (
                      <li key={f.name + idx} className="flex items-center gap-2 text-sm text-muted-foreground max-w-[220px] truncate">
                        {f.type.startsWith('image/') && (
                          <img src={URL.createObjectURL(f)} alt={f.name} className="w-8 h-8 object-cover rounded mr-2 border" />
                        )}
                        <span className="truncate">{f.name}</span>
                        <span className={`ml-2 text-xs ${f.size > MAX_FILE_SIZE ? 'text-red-500' : 'text-muted-foreground'}`}>{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                        <button type="button" className="text-red-500 hover:underline ml-2" onClick={() => {
                          const newFiles = Array.isArray(field.value) ? field.value.filter((_, i) => i !== idx) : [];
                          field.onChange(newFiles);
                        }} disabled={isUploading}>Remover</button>
                      </li>
                    ))}
                  </ul>
                )}
                {isUploading && (
                  <div className="mt-2">
                    <Progress value={uploadProgress} className="h-2" />
                    <span className="text-xs text-muted-foreground">Enviando arquivos... {uploadProgress}%</span>
                  </div>
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={status === 'executing' || isUploading}>
          {status === 'executing' || isUploading ? 'Enviando...' : 'Enviar Requisição'}
        </Button>
      </form>
    </Form>
  )
}
