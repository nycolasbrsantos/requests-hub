"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Attachment {
  id: number;
  filename: string;
  originalName: string;
  mimeType: string;
  webViewLink: string;
  uploadedBy: string;
}

interface Props {
  requestId: number;
  attachments: Attachment[];
  onDelete?: (fileId: string) => void;
}

export function DriveAttachmentsList({ requestId, attachments, onDelete }: Props) {
  const [deleting, setDeleting] = useState<number | null>(null);

  const handleDelete = async (fileId: number) => {
    setDeleting(fileId);
    const res = await fetch(`/api/requests/${requestId}/files/${fileId}`, {
      method: "DELETE",
    });
    if (res.ok && onDelete) onDelete(String(fileId));
    setDeleting(null);
  };

  return (
    <div className="space-y-2">
      {attachments.map((att) => (
        <div key={att.id} className="flex items-center gap-2">
          <a
            href={att.webViewLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline truncate max-w-xs"
            title={att.originalName}
          >
            {att.originalName}
          </a>
          <span className="text-xs text-muted-foreground">({att.uploadedBy})</span>
          <Button
            size="sm"
            variant="destructive"
            disabled={deleting === att.id}
            onClick={() => handleDelete(att.id)}
          >
            {deleting === att.id ? "Removendo..." : "Remover"}
          </Button>
        </div>
      ))}
    </div>
  );
} 