import { useEffect, useState } from 'react';

export interface DriveAttachment {
  id: number;
  filename: string;
  originalName: string;
  mimeType: string;
  webViewLink: string;
  uploadedBy: string;
}

export function useDriveAttachments(requestId: string) {
  const [attachments, setAttachments] = useState<DriveAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/requests/${requestId}/attachments`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Erro ao buscar anexos');
        const data = await res.json();
        setAttachments(data.attachments || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [requestId]);

  return { attachments, loading, error };
} 