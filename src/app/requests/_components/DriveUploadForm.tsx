"use client";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

interface Props {
  requestId: string;
  uploadedBy: string;
  onSuccess?: () => void;
}

const uploadFormSchema = z.object({
  files: z
    .custom<FileList>((v) => v instanceof FileList && v.length > 0, {
      message: "Selecione pelo menos um arquivo.",
    })
});

type DriveUploadFormFields = z.infer<typeof uploadFormSchema>;

export function DriveUploadForm({ requestId, uploadedBy, onSuccess }: Props) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<DriveUploadFormFields>({
    resolver: zodResolver(uploadFormSchema),
  });
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (data: DriveUploadFormFields) => {
    setIsUploading(true);
    setProgress(0);
    setError(null);
    const files: FileList = data.files;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("uploadedBy", uploadedBy);
      try {
        const res = await fetch(`/api/requests/${requestId}/upload`, {
          method: "POST",
          body: formData,
        });
        let resJson: unknown = null;
        try {
          resJson = await res.json();
        } catch {}
        console.log('Upload response:', res.status, resJson);
        if (!res.ok) {
          const hasError = (obj: unknown): obj is { error: unknown; details?: unknown } =>
            typeof obj === 'object' && obj !== null && 'error' in obj;
          const errorMsg = hasError(resJson)
            ? `Erro ao enviar ${file.name}: ${String(resJson.error)}${resJson.details ? ' (' + String(resJson.details) + ')' : ''}`
            : `Erro ao enviar ${file.name}: status ${res.status}`;
          setError(errorMsg);
          setIsUploading(false);
          return;
        }
        setProgress(Math.round(((i + 1) / files.length) * 100));
      } catch (e: unknown) {
        let msg = `Erro ao enviar ${file.name}`;
        if (e instanceof Error) msg += `: ${e.message}`;
        setError(msg);
        setIsUploading(false);
        return;
      }
    }
    setIsUploading(false);
    setProgress(100);
    reset();
    if (onSuccess) onSuccess();
  };

  return (
    <Card className="max-w-md mx-auto shadow border-primary/20">
      <CardHeader>
        <CardTitle>Adicionar Anexos</CardTitle>
        <CardDescription>Selecione um ou mais arquivos para anexar à requisição.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input type="file" multiple {...register("files")}
            disabled={isUploading}
            className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
          {errors.files && <div className="text-red-500 text-sm">{errors.files.message as string}</div>}
          {isUploading && <Progress value={progress} className="h-2" />}
          <Button type="submit" disabled={isUploading} className="w-full">
            {isUploading ? "Enviando..." : "Enviar Arquivos"}
          </Button>
          {error && <div className="text-red-500 text-sm">{error}</div>}
        </form>
      </CardContent>
    </Card>
  );
}