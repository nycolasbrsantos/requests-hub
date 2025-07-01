import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { StatusBadge } from './StatusBadge';
import { Paperclip, Trash2, CheckCircle2, XCircle, Upload, Loader2, FileText, Image, File } from 'lucide-react';
import dayjs from 'dayjs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { updateRequestAttachments } from '@/actions/update-request-status/update-attachments';
import { updateRequestStatus } from '@/actions/update-request-status';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAction } from 'next-safe-action/hooks';
import { Skeleton } from '@/components/ui/skeleton';

interface Attachment {
  filename: string;
  uploadedBy: string;
}

interface StatusHistoryItem {
  status: string;
  changedAt: string;
  changedBy: string;
  comment?: string;
}

interface RequestDetails {
  id: number;
  customId?: string;
  title: string;
  type: string;
  status: string;
  requesterName: string;
  createdAt: string;
  description?: string;
  supplier?: string;
  productName?: string;
  quantity?: number;
  unitPrice?: number;
  attachments: Attachment[];
  statusHistory: StatusHistoryItem[];
}

interface RequestDetailsDialogProps {
  requestId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_FILES = 5;

const statusOptions = [
  { value: 'pending', label: 'Pendente' },
  { value: 'approved', label: 'Aprovada' },
  { value: 'rejected', label: 'Rejeitada' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'completed', label: 'Concluída' },
];

const getFileIcon = (filename?: string) => {
  if (!filename || typeof filename !== 'string') {
    return <File className="w-4 h-4 text-blue-500" />;
  }
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return <FileText className="w-4 h-4 text-red-500" />;
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')) return <Image className="w-4 h-4 text-green-500" />;
  return <File className="w-4 h-4 text-blue-500" />;
};

export default function RequestDetailsDialog({ requestId, open, onOpenChange }: RequestDetailsDialogProps) {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const [request, setRequest] = useState<RequestDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [removingAtt, setRemovingAtt] = useState<Attachment | null>(null);
  const [comment, setComment] = useState('');
  const [isRemoving, setIsRemoving] = useState(false);
  const [showAddAttachment, setShowAddAttachment] = useState(false);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComment, setUploadComment] = useState('');
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [statusComment, setStatusComment] = useState('');
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);

  const { execute: executeUpdateStatus, status: updateStatusState } = useAction(updateRequestStatus, {
    onSuccess: (data) => {
      if (data.data && typeof data.data === 'object' && 'success' in data.data && data.data.success) {
        toast.success(data.data.success, { icon: <CheckCircle2 className="text-green-500" /> });
        // Refetch dados após atualização de status
        setLoading(true);
        fetch(`/api/requests/${requestId}`)
          .then(res => res.json())
          .then(data => setRequest(data))
          .finally(() => setLoading(false));
      }
      if (data.data && typeof data.data === 'object' && 'error' in data.data && data.data.error) {
        toast.error(data.data.error, { icon: <XCircle className="text-red-500" /> });
      }
      setPendingStatus(null);
      setStatusComment('');
      setIsStatusUpdating(false);
    },
    onError: () => {
      toast.error('Erro ao atualizar status.', { icon: <XCircle className="text-red-500" /> });
      setIsStatusUpdating(false);
    }
  });

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetch(`/api/requests/${requestId}`)
        .then(res => res.json())
        .then(data => setRequest(data))
        .finally(() => setLoading(false));
    }
  }, [open, requestId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setNewFiles(files);
  };

  const handleUpload = async () => {
    if (!request || newFiles.length === 0 || !uploadComment.trim()) return;

    setIsUploading(true);
    try {
      const uploaded: Attachment[] = [];
      
      for (const file of newFiles) {
        const formData = new FormData();
        formData.append('file', file);
        
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!res.ok) throw new Error('Erro no upload');
        
        const data = await res.json();
        uploaded.push({ filename: data.filename, uploadedBy: session?.user?.name ?? 'Desconhecido' });
      }

      const newAttachments = [...request.attachments, ...uploaded].slice(0, MAX_FILES);
      
      await updateRequestAttachments({
        id: requestId,
        attachments: newAttachments,
        changedBy: session?.user?.name ?? 'Desconhecido',
        comment: uploadComment,
        action: 'add',
      }).then((data) => {
        if (data && data.success) toast.success(data.success, { icon: <CheckCircle2 className="text-green-500" /> });
        if (data && data.error) toast.error(data.error, { icon: <XCircle className="text-red-500" /> });
      });

      // Refetch dados após upload
      setLoading(true);
      fetch(`/api/requests/${requestId}`)
        .then(res => res.json())
        .then(data => setRequest(data))
        .finally(() => setLoading(false));

      setShowAddAttachment(false);
      setNewFiles([]);
      setUploadComment('');
    } catch {
      toast.error('Erro ao fazer upload dos arquivos', { icon: <XCircle className="text-red-500" /> });
    } finally {
      setIsUploading(false);
    }
  };

  const canUpdateStatus = (newStatus: string) => {
    if (!role || !request) return false;
    
    // Admin pode fazer qualquer mudança
    if (role === 'admin') return true;
    
    // Supervisor pode aprovar, reprovar e colocar em andamento
    if (role === 'supervisor' && ['approved', 'rejected', 'in_progress'].includes(newStatus)) return true;
    
    // Encarregado pode finalizar
    if (role === 'encarregado' && newStatus === 'completed') return true;
    
    return false;
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Detalhes da Requisição {request?.customId || requestId}</DialogTitle>
            {request && (role === 'admin' || role === 'supervisor' || role === 'encarregado') && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Status:</span>
                <Select 
                  value={request.status} 
                  onValueChange={(newStatus) => {
                    if (canUpdateStatus(newStatus)) {
                      setPendingStatus(newStatus);
                    }
                  }}
                  disabled={updateStatusState === 'executing'}
                >
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(opt => (
                      <SelectItem 
                        key={opt.value} 
                        value={opt.value}
                        disabled={!canUpdateStatus(opt.value)}
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {updateStatusState === 'executing' && (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                )}
              </div>
            )}
          </div>
        </DialogHeader>
        {loading || !request ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-2/5" />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><b>Título:</b> {request.title}</div>
              <div><b>Tipo:</b> {request.type}</div>
              <div><b>Status:</b> <StatusBadge status={request.status as 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed'} /></div>
              <div><b>Solicitante:</b> {request.requesterName}</div>
              <div><b>Data:</b> {dayjs(request.createdAt).format('DD/MM/YYYY HH:mm')}</div>
            </div>
            
            {request.description && (
              <div className="text-sm">
                <b>Descrição:</b> {request.description}
              </div>
            )}
            
            {(request.supplier || request.productName || request.quantity || request.unitPrice) && (
              <div className="space-y-2 text-sm">
                {request.supplier && <div><b>Fornecedor:</b> {request.supplier}</div>}
                {request.productName && <div><b>Produto:</b> {request.productName}</div>}
                {request.quantity && <div><b>Quantidade:</b> {request.quantity}</div>}
                {request.unitPrice && <div><b>Preço Unitário:</b> R$ {request.unitPrice}</div>}
              </div>
            )}
            
            {Array.isArray(request.attachments) && request.attachments.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-muted-foreground" />
                  <b className="text-sm">Anexos ({request.attachments.length})</b>
                </div>
                <div className="space-y-2">
                  {request.attachments.map((att) => (
                    <div key={att.filename} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getFileIcon(att.filename)}
                        <a 
                          href={`/uploads/${att.filename}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-primary underline truncate hover:text-primary/80"
                          title={att.filename}
                        >
                          {att.filename}
                        </a>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>({att.uploadedBy})</span>
                        {session?.user?.name === att.uploadedBy && (
                          <button 
                            className="text-red-500 hover:text-red-700 transition-colors" 
                            onClick={() => setRemovingAtt(att)}
                            title="Remover anexo"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full" />
                <b className="text-sm">Histórico</b>
              </div>
              {Array.isArray(request.statusHistory) && request.statusHistory.length > 0 ? (
                <ol className="relative border-l border-muted-foreground/30 ml-2 space-y-4">
                  {request.statusHistory.map((h, idx) => (
                    <li key={idx} className="ml-4">
                      <div className="absolute w-3 h-3 bg-primary rounded-full -left-1.5 border-2 border-white" />
                      <div className="flex items-center gap-2">
                        {h.status === 'attachment_added' ? (
                          <Paperclip className="w-4 h-4 text-blue-500" />
                        ) : h.status === 'attachment_removed' ? (
                          <Trash2 className="w-4 h-4 text-red-500" />
                        ) : (
                          <StatusBadge status={h.status as 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed'} />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {h.status === 'attachment_added' && 'Anexo adicionado'}
                          {h.status === 'attachment_removed' && 'Anexo removido'}
                          {h.status !== 'attachment_added' && h.status !== 'attachment_removed' && null}
                        </span>
                        <span className="text-xs text-muted-foreground">{dayjs(h.changedAt).format('DD/MM/YYYY HH:mm')}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        por <span className="font-medium text-foreground">{h.changedBy}</span>
                        {h.comment && (
                          <div className="mt-1 text-xs italic text-muted-foreground bg-muted/50 p-2 rounded">
                            {h.comment}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="text-sm text-muted-foreground italic">Nenhum histórico registrado para esta requisição.</div>
              )}
            </div>
          </div>
        )}
        <DialogFooter>
          <button className="px-4 py-2 bg-muted text-foreground rounded hover:bg-muted/80 transition" onClick={() => onOpenChange(false)}>
            Fechar
          </button>
          {Array.isArray(request?.attachments) && request.attachments.length < MAX_FILES && (
            <Button
              onClick={() => setShowAddAttachment(true)}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition ml-2"
            >
              <Upload className="w-4 h-4 mr-2" />
              Adicionar Anexo
            </Button>
          )}
        </DialogFooter>
        
        {/* Dialog para comentário obrigatório ao remover anexo */}
        <Dialog open={!!removingAtt} onOpenChange={open => { if (!open) { setRemovingAtt(null); setComment(''); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remover Anexo</DialogTitle>
            </DialogHeader>
            <div className="mb-2 text-sm">Descreva o motivo da remoção (obrigatório):</div>
            <Textarea
              placeholder="Comentário obrigatório"
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={3}
              className="mb-2"
            />
            <DialogFooter>
              <button className="px-4 py-2 bg-muted text-foreground rounded hover:bg-muted/80 transition" onClick={() => { setRemovingAtt(null); setComment(''); }}>
                Cancelar
              </button>
              <button className="px-4 py-2 bg-destructive text-white rounded hover:bg-destructive/90 transition" disabled={!comment.trim() || isRemoving} onClick={async () => {
                setIsRemoving(true);
                const filtered = (request!.attachments).filter(a => a.filename !== removingAtt!.filename || a.uploadedBy !== removingAtt!.uploadedBy);
                await updateRequestAttachments({
                  id: requestId,
                  attachments: filtered,
                  changedBy: session?.user?.name ?? 'Desconhecido',
                  comment,
                  action: 'remove',
                }).then((data) => {
                  if (data && data.success) toast.success(data.success, { icon: <CheckCircle2 className="text-green-500" /> });
                  if (data && data.error) toast.error(data.error, { icon: <XCircle className="text-red-500" /> });
                });
                setIsRemoving(false);
                setRemovingAtt(null);
                setComment('');
                // Refetch os dados após remoção
                setLoading(true);
                fetch(`/api/requests/${requestId}`)
                  .then(res => res.json())
                  .then(data => setRequest(data))
                  .finally(() => setLoading(false));
              }}>Confirmar Remoção</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog para adicionar anexos */}
        <Dialog open={showAddAttachment} onOpenChange={open => { if (!open) { setShowAddAttachment(false); setNewFiles([]); setUploadComment(''); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Anexo à Requisição {request?.customId || requestId}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Selecionar arquivos:</label>
                <input 
                  type="file" 
                  multiple 
                  accept=".pdf,image/png,image/jpeg" 
                  onChange={handleFileSelect}
                  className="w-full p-2 border rounded"
                />
                {newFiles.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {newFiles.map((f, idx) => (
                      <li key={f.name + idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                        {getFileIcon(f.name)}
                        <span className="truncate">{f.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Comentário (obrigatório):</label>
                <Textarea
                  placeholder="Descreva o motivo da adição"
                  value={uploadComment}
                  onChange={e => setUploadComment(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <button className="px-4 py-2 bg-muted text-foreground rounded hover:bg-muted/80 transition" onClick={() => { setShowAddAttachment(false); setNewFiles([]); setUploadComment(''); }}>
                Cancelar
              </button>
              <button 
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition" 
                disabled={newFiles.length === 0 || !uploadComment.trim() || isUploading || (Array.isArray(request?.attachments) && request.attachments.length + newFiles.length > MAX_FILES)}
                onClick={handleUpload}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Salvar'
                )}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog para comentário obrigatório ao atualizar status */}
        <Dialog open={!!pendingStatus} onOpenChange={open => { if (!open) { setPendingStatus(null); setStatusComment(''); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Comentário obrigatório</DialogTitle>
            </DialogHeader>
            <div className="mb-2 text-sm">Descreva o motivo da alteração de status:</div>
            <Textarea
              placeholder="Comentário obrigatório"
              value={statusComment}
              onChange={e => setStatusComment(e.target.value)}
              rows={3}
              className="mb-2"
            />
            <DialogFooter>
              <button className="px-4 py-2 bg-muted text-foreground rounded hover:bg-muted/80 transition" onClick={() => { setPendingStatus(null); setStatusComment(''); }}>
                Cancelar
              </button>
              <button 
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition" 
                disabled={!statusComment.trim() || isStatusUpdating}
                onClick={() => {
                  setIsStatusUpdating(true);
                  executeUpdateStatus({
                    id: requestId,
                    status: pendingStatus as 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed',
                    changedBy: session?.user?.name ?? undefined,
                    comment: statusComment,
                  });
                }}
              >
                {isStatusUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Confirmar
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
} 