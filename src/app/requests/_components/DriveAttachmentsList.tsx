"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Attachment {
  customId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  webViewLink: string;
  uploadedBy: string;
}

interface Props {
  requestId: string;
  attachments: Attachment[];
  onDelete?: (fileId: string) => void;
}

export function DriveAttachmentsList({ requestId, attachments, onDelete }: Props) {
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (fileId: string) => {
    setDeleting(fileId);
    const res = await fetch(`/api/requests/${requestId}/files/${fileId}`, {
      method: "DELETE",
    });
    if (res.ok && onDelete) onDelete(fileId);
    setDeleting(null);
  };

  return (
    <div className="space-y-2">
      {attachments.map((att) => (
        <div key={att.customId} className="flex items-center gap-2">
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
            disabled={deleting === att.customId}
            onClick={() => handleDelete(att.customId)}
          >
            {deleting === att.customId ? "Removendo..." : "Remover"}
          </Button>
        </div>
      ))}
    </div>
  );
} 