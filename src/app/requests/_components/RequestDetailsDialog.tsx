import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { StatusBadge } from './StatusBadge';
import {
  Paperclip,
  CheckCircle2,
  XCircle,
  ShoppingCart,
  Wrench,
  Headphones,
  Flag,
  FileText,
  User,
  CalendarDays,
  ArrowRightLeft,
  Loader2,
  ArrowDownToLine,
} from 'lucide-react';
import dayjs from 'dayjs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { saveAs } from 'file-saver';

// Tipos reutilizáveis
interface Attachment {
  id: string;
  name: string;
  webViewLink?: string;
}

interface StatusHistoryItem {
  status: StatusType;
  changedAt: string;
  changedBy: string;
  comment?: string;
}

type StatusType = 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed';

interface RequestDetails {
  id: number;
  customId?: string;
  title: string;
  type: string;
  status: StatusType;
  requesterName: string;
  createdAt: string;
  description?: string;
  supplier?: string;
  productName?: string;
  quantity?: number;
  unitPrice?: number;
  attachments: Attachment[];
  statusHistory: StatusHistoryItem[];
  priority?: string;
  location?: string;
  maintenanceType?: string;
  issueTitle?: string;
  urgency?: string;
  equipment?: string;
  category?: string;
}

interface RequestDetailsDialogProps {
  requestId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Hook para buscar detalhes da requisição
function useRequestDetails(requestId: number, open: boolean) {
  const [request, setRequest] = useState<RequestDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    fetch(`/api/requests/${requestId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Erro ao buscar detalhes');
        return res.json();
      })
      .then(setRequest)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [requestId, open]);

  return { request, loading, error };
}

// Header do modal
function RequestDetailsHeader({ request }: { request: RequestDetails }) {
  return (
    <div className="flex items-center gap-4 mb-2">
      {request.type === 'purchase' && (
        <ShoppingCart className={`w-8 h-8 ${getPriorityColor(request.priority)}`} />
      )}
      {request.type === 'maintenance' && (
        <Wrench className={`w-8 h-8 ${getPriorityColor(request.priority)}`} />
      )}
      {["it_support", "it_ticket"].includes(request.type) && (
        <Headphones className="w-8 h-8 text-blue-600" />
      )}
      <div>
        <div className="flex items-center gap-2">
          {request.status ? (
            <Badge className="text-base px-3 py-1 ml-2 shadow-md border-2 border-white/70 animate-fade-in transition-transform duration-150 hover:scale-105 focus-visible:scale-105 focus-visible:ring-2 focus-visible:ring-ring/50">
              <StatusBadge status={request.status} />
            </Badge>
          ) : (
            <span className="ml-2 text-sm font-medium text-muted-foreground">-</span>
          )}
          {request.priority && (
            <Flag className={`w-5 h-5 ml-2 ${getPriorityColor(request.priority)}`} />
          )}
          <span className="ml-2 text-sm font-medium text-muted-foreground">
            {request.priority ? getPriorityLabel(request.priority) : '-'}
          </span>
        </div>
        <div className="text-lg font-semibold text-primary mt-1">{request.title}</div>
        <div className="flex gap-4 mt-1 text-sm text-muted-foreground items-center">
          <span className="flex items-center gap-1">
            <CalendarDays className="w-4 h-4" />
            {dayjs(request.createdAt).format('DD/MM/YYYY HH:mm')}
          </span>
          {request.requesterName && (
            <span className="flex items-center gap-1">
              <User className="w-4 h-4" />
              {request.requesterName}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Informações gerais
function RequestGeneralInfo({ request }: { request: RequestDetails }) {
  return (
    <div className="bg-white/80 rounded-xl shadow p-4 border">
      <div className="font-semibold text-primary mb-2 flex items-center gap-2">
        <FileText className="w-4 h-4" /> Informações Gerais
      </div>
      <div className="mb-1"><b>Tipo:</b> {getTypeLabel(request.type)}</div>
      <div className="mb-1"><b>Status:</b> <StatusBadge status={request.status} /></div>
      <div className="mb-1"><b>Prioridade:</b> {request.priority ? getPriorityLabel(request.priority) : '-'}</div>
      {request.description && <div className="mb-1"><b>Descrição:</b> {request.description}</div>}
    </div>
  );
}

// Detalhes específicos
function RequestSpecificDetails({ request }: { request: RequestDetails }) {
  if (request.type === 'purchase') {
    return (
      <div className="bg-blue-50 rounded-xl shadow p-4 border border-blue-200">
        <div className="font-semibold text-primary mb-2 flex items-center gap-2">
          <ShoppingCart className="w-4 h-4" /> Detalhes de Compra
        </div>
        {request.productName && <div><b>Produto:</b> {request.productName}</div>}
        {request.quantity !== undefined && <div><b>Quantidade:</b> {request.quantity}</div>}
        {request.unitPrice !== undefined && <div><b>Preço Unitário:</b> R$ {request.unitPrice}</div>}
        {request.supplier && <div><b>Fornecedor:</b> {request.supplier}</div>}
      </div>
    );
  }
  if (request.type === 'maintenance') {
    return (
      <div className="bg-yellow-50 rounded-xl shadow p-4 border border-yellow-200">
        <div className="font-semibold text-yellow-700 mb-2 flex items-center gap-2">
          <Wrench className="w-4 h-4" /> Detalhes de Manutenção
        </div>
        {request.equipment && <div><b>Equipamento:</b> {request.equipment}</div>}
        {request.location && <div><b>Local:</b> {request.location}</div>}
        {request.maintenanceType && <div><b>Tipo de Manutenção:</b> {request.maintenanceType}</div>}
      </div>
    );
  }
  if (["it_support", "it_ticket"].includes(request.type)) {
    return (
      <div className="bg-blue-50 rounded-xl shadow p-4 border border-blue-200">
        <div className="font-semibold text-blue-700 mb-2 flex items-center gap-2">
          <Headphones className="w-4 h-4" /> Detalhes de Suporte T.I.
        </div>
        {request.category && <div><b>Categoria:</b> {request.category}</div>}
        {request.issueTitle && <div><b>Título do Problema:</b> {request.issueTitle}</div>}
        {request.urgency && <div><b>Urgência:</b> {getPriorityLabel(request.urgency)}</div>}
      </div>
    );
  }
  return null;
}

// Anexos
function RequestAttachments({ attachments }: { attachments: Attachment[] }) {
  return (
    <div className="bg-white/80 rounded-xl shadow p-4 border">
      <div className="font-semibold flex items-center gap-2 mb-2">
        <Paperclip className="w-4 h-4" /> Anexos
      </div>
      {attachments && attachments.length > 0 ? (
        <ul className="space-y-2">
          {attachments.map((att) => (
            <li key={att.id} className="flex items-center gap-2">
              <a
                href={att.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline flex items-center gap-1"
              >
                <Paperclip className="w-4 h-4" /> {att.name}
              </a>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => att.webViewLink && saveAs(att.webViewLink, att.name)}
                title="Baixar"
              >
                <ArrowDownToLine className="w-4 h-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-muted-foreground text-sm">Nenhum anexo.</div>
      )}
    </div>
  );
}

// Histórico de status
function RequestStatusHistory({ history }: { history: StatusHistoryItem[] }) {
  return (
    <div className="bg-white/80 rounded-xl shadow p-4 border">
      <div className="font-semibold flex items-center gap-2 mb-2">
        <ArrowRightLeft className="w-4 h-4" /> Histórico de Status
      </div>
      <ul className="space-y-3 border-l-2 border-primary/30 pl-4">
        {history && history.length > 0 ? (
          history.map((item, idx) => (
            <li key={idx} className="relative">
              <span className="absolute -left-4 top-1.5 w-3 h-3 rounded-full bg-primary/80 border-2 border-white"></span>
              <div className="flex items-center gap-2">
                {item.status === 'approved' && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                {item.status === 'rejected' && <XCircle className="w-4 h-4 text-red-600" />}
                {item.status === 'in_progress' && <Loader2 className="w-4 h-4 text-yellow-600 animate-spin" />}
                {item.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                <span className="font-semibold capitalize">{item.status}</span>
                <span className="text-xs text-muted-foreground ml-2">{dayjs(item.changedAt).format('DD/MM/YYYY HH:mm')}</span>
              </div>
              {item.comment && <div className="text-xs text-muted-foreground ml-6 mt-1">{item.comment}</div>}
              <div className="text-xs text-muted-foreground ml-6">Por: {item.changedBy}</div>
            </li>
          ))
        ) : (
          <li className="text-muted-foreground text-sm">Sem histórico.</li>
        )}
      </ul>
    </div>
  );
}

// Ações do rodapé
function RequestDetailsActions({ request }: { request: RequestDetails }) {
  return (
    <Button
      variant="outline"
      onClick={() => handleGeneratePdf(request)}
      title="Gerar PDF da requisição"
    >
      <FileText className="w-4 h-4 mr-2" /> Gerar PDF
    </Button>
  );
}

// Funções utilitárias
function getPriorityColor(priority?: string) {
  if (priority === 'high') return 'text-red-600';
  if (priority === 'medium') return 'text-yellow-500';
  if (priority === 'low') return 'text-green-600';
  return 'text-primary';
}
function getPriorityLabel(priority?: string) {
  if (priority === 'high') return 'Alta';
  if (priority === 'medium') return 'Média';
  if (priority === 'low') return 'Baixa';
  return '-';
}
function getTypeLabel(type: string) {
  if (type === 'purchase') return 'Compras';
  if (type === 'maintenance') return 'Manutenção';
  return 'T.I.';
}
async function handleGeneratePdf(request: RequestDetails) {
  const res = await fetch(`/api/requests/${request.id}/generate-pdf`);
  if (!res.ok) {
    alert('Erro ao gerar PDF');
    return;
  }
  const blob = await res.blob();
  saveAs(blob, `Requisicao-${request.customId || request.id}.pdf`);
}

// Componente principal
export default function RequestDetailsDialog({ requestId, open, onOpenChange }: RequestDetailsDialogProps) {
  const { request, loading, error } = useRequestDetails(requestId, open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-[700px] max-w-2xl p-8">
        <DialogHeader>
          <DialogTitle>
            {loading || !request
              ? 'Detalhes da Requisição'
              : request.customId || request.title || '-'}
          </DialogTitle>
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
            <RequestDetailsHeader request={request} />
          )}
        </DialogHeader>
        {error && (
          <div className="text-destructive text-center py-4">{error}</div>
        )}
        {!loading && request && (
          <div className="grid grid-cols-2 gap-8 mt-4">
            <div className="space-y-6">
              <RequestGeneralInfo request={request} />
              <RequestSpecificDetails request={request} />
            </div>
            <div className="space-y-6">
              <RequestAttachments attachments={request.attachments} />
              <RequestStatusHistory history={request.statusHistory} />
            </div>
          </div>
        )}
        <DialogFooter className="mt-8 flex justify-end gap-4">
          {!loading && request && <RequestDetailsActions request={request} />}
          <DialogClose asChild>
            <Button variant="ghost">Fechar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 