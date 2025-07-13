"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, File, X, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface POFileUploadProps {
  poNumber: string;
  prFolderId: string;
  onUploadComplete?: (fileIds: string[]) => void;
}

interface UploadedFile {
  id: string;
  name: string;
  webViewLink?: string;
  size?: number;
}

export function POFileUpload({ poNumber, prFolderId, onUploadComplete }: POFileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeUploadedFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const uploadFiles = async () => {
    if (files.length === 0) {
      toast.error('Selecione pelo menos um arquivo para upload.');
      return;
    }

    setIsUploading(true);
    const uploadedFileIds: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('poNumber', poNumber);
        formData.append('prFolderId', prFolderId);

        const res = await fetch('/api/po-upload', {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          toast.error(`Erro ao enviar ${file.name}`);
          continue;
        }
        const uploadedFile = await res.json();
        const uploadedFileInfo: UploadedFile = {
          id: uploadedFile.id || '',
          name: uploadedFile.name || file.name,
          webViewLink: uploadedFile.webViewLink || undefined,
          size: file.size,
        };
        setUploadedFiles(prev => [...prev, uploadedFileInfo]);
        uploadedFileIds.push(uploadedFile.id || '');
        toast.success(`Arquivo ${file.name} enviado com sucesso!`);
      }
      setFiles([]);
      if (onUploadComplete) {
        onUploadComplete(uploadedFileIds);
      }
      toast.success('Upload concluído com sucesso!');
    } catch (error) {
      console.error('Erro durante upload:', error);
      toast.error('Erro durante o upload dos arquivos.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <File className="w-5 h-5" />
          Arquivos da PO {poNumber}
        </CardTitle>
        <CardDescription>
          Faça upload dos arquivos relacionados à Purchase Order
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Seleção de arquivos */}
        <div className="space-y-2">
          <Label htmlFor="po-files">Selecionar arquivos</Label>
          <Input
            id="po-files"
            type="file"
            multiple
            onChange={handleFileSelect}
            disabled={isUploading}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
          />
        </div>

        {/* Lista de arquivos selecionados */}
        {files.length > 0 && (
          <div className="space-y-2">
            <Label>Arquivos selecionados ({files.length})</Label>
            <div className="space-y-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    <File className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    disabled={isUploading}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botão de upload */}
        {files.length > 0 && (
          <Button
            onClick={uploadFiles}
            disabled={isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando arquivos...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Enviar {files.length} arquivo{files.length > 1 ? 's' : ''}
              </>
            )}
          </Button>
        )}

        {/* Lista de arquivos enviados */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-2">
            <Label>Arquivos enviados ({uploadedFiles.length})</Label>
            <div className="space-y-2">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-2 border rounded bg-muted/50">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">{file.name}</span>
                    {file.size && (
                      <span className="text-xs text-muted-foreground">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {file.webViewLink && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(file.webViewLink, '_blank')}
                      >
                        Ver
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeUploadedFile(file.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 