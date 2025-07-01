import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { StatusBadge } from './StatusBadge';
import { Paperclip, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import dayjs from 'dayjs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { updateRequestAttachments } from '@/actions/update-request-status/update-attachments';
import { useSession } from 'next-auth/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { DriveUploadForm } from './DriveUploadForm';

interface Attachment {
  id: string;
  name: string;
  webViewLink?: string;
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

const statusOptions = [
  { value: 'pending', label: 'Pendente' },
  { value: 'approved', label: 'Aprovada' },
  { value: 'rejected', label: 'Rejeitada' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'completed', label: 'Concluída' },
];

export default function RequestDetailsDialog({ requestId, open, onOpenChange }: RequestDetailsDialogProps) {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const [request, setRequest] = useState<RequestDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [removingAtt, setRemovingAtt] = useState<Attachment | null>(null);
  const [comment, setComment] = useState('');
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetch(`/api/requests/${requestId}`)
        .then(res => res.json())
        .then(data => setRequest(data))
        .finally(() => setLoading(false));
    }
  }, [open, requestId]);

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
                  onValueChange={() => {}}
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
            
            {/* NOVO BLOCO DE ANEXOS GOOGLE DRIVE */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-muted-foreground" />
                <b className="text-sm">Anexos</b>
              </div>
              {/* Formulário de upload de anexos */}
              <DriveUploadForm
                requestId={requestId}
                uploadedBy={session?.user?.name ?? 'Desconhecido'}
                onSuccess={() => {
                  setLoading(true);
                  fetch(`/api/requests/${requestId}`)
                    .then(res => res.json())
                    .then(data => setRequest(data))
                    .finally(() => setLoading(false));
                }}
              />
              {/* Lista de anexos */}
              {request.attachments && request.attachments.length > 0 ? (
                <ul className="space-y-1">
                  {request.attachments.map((att) => (
                    <li key={att.id} className="flex items-center gap-2">
                      <a
                        href={att.webViewLink || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                        aria-label={`Abrir anexo ${att.name}`}
                      >
                        <Paperclip className="w-4 h-4" />
                        {att.name}
                      </a>
                      {/* Botão de remover, se permitido */}
                      {/*
                      <button
                        type="button"
                        className="ml-1 text-red-500 hover:text-red-700"
                        aria-label={`Remover anexo ${att.name}`}
                        onClick={() => setRemovingAtt(att)}
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                      */}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-muted-foreground">Nenhum anexo enviado.</div>
              )}
            </div>
            
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
                const filtered = (request!.attachments).filter(a => a.id !== removingAtt!.id);
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
      </DialogContent>
    </Dialog>
  );
} 