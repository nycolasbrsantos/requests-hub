"use client";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

interface Props {
  requestId: number;
  uploadedBy: string;
  onSuccess?: () => void;
}

export function DriveUploadForm({ requestId, uploadedBy, onSuccess }: Props) {
  const { register, handleSubmit, reset } = useForm();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (data: any) => {
    setIsUploading(true);
    setProgress(0);
    setError(null);
    const files: FileList = data.files;
    if (!files || files.length === 0) {
      setError("Selecione pelo menos um arquivo.");
      setIsUploading(false);
      return;
    }
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
        if (!res.ok) throw new Error("Falha ao enviar arquivo");
        setProgress(Math.round(((i + 1) / files.length) * 100));
      } catch (e) {
        setError(`Erro ao enviar ${file.name}`);
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input type="file" multiple {...register("files")} disabled={isUploading} />
      {isUploading && <Progress value={progress} className="h-2" />}
      {error && <div className="text-red-500 text-sm">{error}</div>}
      <Button type="submit" disabled={isUploading}>
        {isUploading ? "Enviando..." : "Enviar Arquivos"}
      </Button>
    </form>
  );
} 