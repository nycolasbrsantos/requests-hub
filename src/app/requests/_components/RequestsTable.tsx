"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { Request } from '@/db/schema';
import dayjs from 'dayjs';
import { StatusBadge } from './StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { MoreVertical, Info, CheckCircle2, XCircle, ArrowUpDown, ArrowUp, ArrowDown, Loader2, FileQuestion, Clock, Paperclip, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSession } from 'next-auth/react';
import { useTransition } from 'react';
import { updateRequestAttachments } from '@/actions/update-request-status/update-attachments';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';
import { updateRequestStatus } from '@/actions/update-request-status';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import RequestDetailsDialog from './RequestDetailsDialog';

interface RequestsTableProps {
  requests: Request[];
  isLoading?: boolean;
}

const statusOptions = [
  { value: 'all', label: 'Todos os status' },
  { value: 'pending', label: 'Pendente' },
  { value: 'approved', label: 'Aprovada' },
  { value: 'rejected', label: 'Rejeitada' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'completed', label: 'Concluída' },
];

const typeOptions = [
  { value: 'all', label: 'Todos os tipos' },
  { value: 'purchase', label: 'Compras' },
  { value: 'maintenance', label: 'Manutenção' },
  { value: 'it_ticket', label: 'T.I.' },
];

export default function RequestsTable({ requests, isLoading = false }: RequestsTableProps) {
  const { data: session } = useSession();
  const role = session?.user.role;
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [openModalId, setOpenModalId] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [comment, setComment] = useState('');
  const [openDetailsId, setOpenDetailsId] = useState<number | null>(null);
  const [openAddAttachmentId, setOpenAddAttachmentId] = useState<number | null>(null);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const MAX_FILES = 5;
  const [isUpdatingAttachments, startUpdateAttachments] = useTransition();
  const [confirmRemove, setConfirmRemove] = useState<{ reqId: number; att: { filename: string; uploadedBy: string } } | null>(null);
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: keyof Request | 'customId'; direction: 'asc' | 'desc' }>({ key: 'createdAt', direction: 'desc' });
  const [dateStart, setDateStart] = useState<string>('');
  const [dateEnd, setDateEnd] = useState<string>('');
  const [isFiltering, setIsFiltering] = useState(false);
  const [openHistoryId, setOpenHistoryId] = useState<number | null>(null);
  const [attachmentAction, setAttachmentAction] = useState<{ reqId: number; type: 'add' | 'remove'; file?: File; att?: { filename: string; uploadedBy: string } } | null>(null);
  const [attachmentComment, setAttachmentComment] = useState('');
  const [isAttachmentLoading, setIsAttachmentLoading] = useState(false);
  const router = useRouter();

  const { execute: executeUpdateStatus, status: updateStatusState } = useAction(updateRequestStatus, {
    onSuccess: (data) => {
      if (data.data && typeof data.data === 'object' && 'success' in data.data && data.data.success)
        toast.success(data.data.success, { icon: <CheckCircle2 className="text-green-500" /> });
      if (data.data && typeof data.data === 'object' && 'error' in data.data && data.data.error)
        toast.error(data.data.error, { icon: <XCircle className="text-red-500" /> });
    },
    onError: () => {
      toast.error('Erro ao atualizar status.', { icon: <XCircle className="text-red-500" /> });
    },
  });

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const statusMatch = status === 'all' ? true : req.status === status;
      const typeMatch = type === 'all' ? true : req.type === type;
      const searchMatch = search.trim() === '' ||
        (req.title && req.title.toLowerCase().includes(search.toLowerCase())) ||
        (req.requesterName && req.requesterName.toLowerCase().includes(search.toLowerCase())) ||
        (req.customId && req.customId.toLowerCase().includes(search.toLowerCase())) ||
        (req.id && req.id.toString().includes(search));
      const createdAt = req.createdAt ? dayjs(req.createdAt) : null;
      const startMatch = dateStart ? (createdAt && createdAt.isAfter(dayjs(dateStart).subtract(1, 'day'))) : true;
      const endMatch = dateEnd ? (createdAt && createdAt.isBefore(dayjs(dateEnd).add(1, 'day'))) : true;
      return statusMatch && typeMatch && searchMatch && startMatch && endMatch;
    });
  }, [requests, status, type, search, dateStart, dateEnd]);

  const sortedRequests = useMemo(() => {
    const arr = [...filteredRequests];
    arr.sort((a, b) => {
      let aValue = a[sort.key as keyof Request];
      let bValue = b[sort.key as keyof Request];
      if (sort.key === 'customId') {
        aValue = a.customId || '';
        bValue = b.customId || '';
      }
      if (aValue === undefined || bValue === undefined) return 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sort.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sort.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      if (aValue instanceof Date && bValue instanceof Date) {
        return sort.direction === 'asc'
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }
      return 0;
    });
    return arr;
  }, [filteredRequests, sort]);

  const paginatedRequests = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedRequests.slice(start, start + PAGE_SIZE);
  }, [sortedRequests, page]);

  const totalPages = Math.ceil(filteredRequests.length / PAGE_SIZE);
  const totalFiltered = filteredRequests.length;

  useEffect(() => { setPage(1); }, [status, type, search]);

  useEffect(() => {
    setIsFiltering(true);
    const timeout = setTimeout(() => setIsFiltering(false), 350);
    return () => clearTimeout(timeout);
  }, [status, type, search, dateStart, dateEnd, sort, page]);

  const handleSort = (key: keyof Request | 'customId') => {
    setSort(prev =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    );
  };

  const isAnyFilterActive = status !== 'all' || type !== 'all' || search.trim() !== '' || dateStart !== '' || dateEnd !== '';
  const handleClearFilters = () => {
    setStatus('all');
    setType('all');
    setSearch('');
    setDateStart('');
    setDateEnd('');
  };

  if (isLoading || isFiltering) {
    return (
      <div className="w-full overflow-x-auto rounded-md border bg-white dark:bg-zinc-900">
        <table className="min-w-full">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-2 text-left whitespace-nowrap">ID</th>
              <th className="px-4 py-2 text-left whitespace-nowrap max-w-xs">Título</th>
              <th className="px-4 py-2 text-left whitespace-nowrap">Tipo</th>
              <th className="px-4 py-2 text-left whitespace-nowrap">Status</th>
              <th className="px-4 py-2 text-left whitespace-nowrap max-w-xs">Solicitante</th>
              <th className="px-4 py-2 text-left whitespace-nowrap">Data</th>
              <th className="px-4 py-2 text-left whitespace-nowrap">Ações</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i} className="border-b">
                <td className="px-4 py-2"><Skeleton className="h-4 w-16" /></td>
                <td className="px-4 py-2 max-w-xs"><Skeleton className="h-4 w-32" /></td>
                <td className="px-4 py-2"><Skeleton className="h-4 w-20" /></td>
                <td className="px-4 py-2"><Skeleton className="h-4 w-20" /></td>
                <td className="px-4 py-2 max-w-xs"><Skeleton className="h-4 w-24" /></td>
                <td className="px-4 py-2"><Skeleton className="h-4 w-24" /></td>
                <td className="px-4 py-2"><Skeleton className="h-8 w-16 rounded" /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-primary">Filtrando...</span>
        </div>
      </div>
    );
  }

  if (!requests || requests.length === 0 || totalFiltered === 0) {
    return (
      <div className="border rounded-md p-8 bg-white dark:bg-zinc-900 flex flex-col items-center justify-center gap-2">
        <FileQuestion className="w-10 h-10 text-muted-foreground mb-2" />
        <p className="text-center text-muted-foreground font-medium">Nenhuma requisição encontrada com os filtros atuais.</p>
        <p className="text-center text-xs text-muted-foreground">Tente ajustar os filtros ou limpar todos para ver mais resultados.</p>
      </div>
    );
  }

  return (
    <div>
      {role === 'admin' && (
        <div className="mb-4 p-2 rounded bg-green-100 text-green-800 text-sm font-medium">Visão de administrador: você pode ver e gerenciar todas as requisições.</div>
      )}
      {role === 'supervisor' && (
        <div className="mb-4 p-2 rounded bg-blue-100 text-blue-800 text-sm font-medium">Visão de supervisor: você pode aprovar, reprovar e encaminhar requisições.</div>
      )}
      {role === 'encarregado' && (
        <div className="mb-4 p-2 rounded bg-yellow-100 text-yellow-800 text-sm font-medium">Visão de encarregado: você pode executar e finalizar requisições do seu setor.</div>
      )}
      {role === 'user' && (
        <div className="mb-4 p-2 rounded bg-gray-100 text-gray-800 text-sm font-medium">Visão de usuário: você pode criar e consultar suas próprias requisições.</div>
      )}
      <div className="mb-2 text-sm text-muted-foreground">
        {totalFiltered === 1 ? '1 requisição encontrada' : `${totalFiltered} requisições encontradas`}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-4 mb-4 flex-wrap items-end">
        <Input
          placeholder="Buscar por título, solicitante ou ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={`w-full sm:w-72 ${search.trim() !== '' ? 'border-primary ring-1 ring-primary' : ''}`}
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className={`w-full sm:w-48 ${status !== 'all' ? 'border-primary ring-1 ring-primary' : ''}`}>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className={`w-full sm:w-48 ${type !== 'all' ? 'border-primary ring-1 ring-primary' : ''}`}>
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            {typeOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateStart}
          onChange={e => setDateStart(e.target.value)}
          className={`w-full sm:w-44 ${dateStart ? 'border-primary ring-1 ring-primary' : ''}`}
          placeholder="Data inicial"
        />
        <Input
          type="date"
          value={dateEnd}
          onChange={e => setDateEnd(e.target.value)}
          className={`w-full sm:w-44 ${dateEnd ? 'border-primary ring-1 ring-primary' : ''}`}
          placeholder="Data final"
        />
        {isAnyFilterActive && (
          <Button
            type="button"
            variant="outline"
            className="h-10 px-3 flex items-center gap-2 border-destructive text-destructive hover:bg-destructive/10"
            onClick={handleClearFilters}
            title="Limpar filtros"
          >
            <XCircle className="w-4 h-4" /> Limpar filtros
          </Button>
        )}
      </div>
      <div className="w-full overflow-x-auto rounded-md border bg-white dark:bg-zinc-900">
        <AnimatePresence mode="wait">
          <motion.table
            key={JSON.stringify([status, type, search, dateStart, dateEnd, sort, page])}
            className="min-w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2 text-left whitespace-nowrap cursor-pointer select-none" onClick={() => handleSort('customId')}>
                  ID {sort.key === 'customId' ? (sort.direction === 'asc' ? <ArrowUp className="inline w-4 h-4 ml-1 text-primary" /> : <ArrowDown className="inline w-4 h-4 ml-1 text-primary" />) : <ArrowUpDown className="inline w-4 h-4 ml-1 text-muted-foreground" />}
                </th>
                <th className="px-4 py-2 text-left whitespace-nowrap max-w-xs cursor-pointer select-none" onClick={() => handleSort('title')}>
                  Título {sort.key === 'title' ? (sort.direction === 'asc' ? <ArrowUp className="inline w-4 h-4 ml-1 text-primary" /> : <ArrowDown className="inline w-4 h-4 ml-1 text-primary" />) : <ArrowUpDown className="inline w-4 h-4 ml-1 text-muted-foreground" />}
                </th>
                <th className="px-4 py-2 text-left whitespace-nowrap cursor-pointer select-none" onClick={() => handleSort('type')}>
                  Tipo {sort.key === 'type' ? (sort.direction === 'asc' ? <ArrowUp className="inline w-4 h-4 ml-1 text-primary" /> : <ArrowDown className="inline w-4 h-4 ml-1 text-primary" />) : <ArrowUpDown className="inline w-4 h-4 ml-1 text-muted-foreground" />}
                </th>
                <th className="px-4 py-2 text-left whitespace-nowrap cursor-pointer select-none" onClick={() => handleSort('status')}>
                  Status {sort.key === 'status' ? (sort.direction === 'asc' ? <ArrowUp className="inline w-4 h-4 ml-1 text-primary" /> : <ArrowDown className="inline w-4 h-4 ml-1 text-primary" />) : <ArrowUpDown className="inline w-4 h-4 ml-1 text-muted-foreground" />}
                </th>
                <th className="px-4 py-2 text-left whitespace-nowrap max-w-xs cursor-pointer select-none" onClick={() => handleSort('requesterName')}>
                  Solicitante {sort.key === 'requesterName' ? (sort.direction === 'asc' ? <ArrowUp className="inline w-4 h-4 ml-1 text-primary" /> : <ArrowDown className="inline w-4 h-4 ml-1 text-primary" />) : <ArrowUpDown className="inline w-4 h-4 ml-1 text-muted-foreground" />}
                </th>
                <th className="px-4 py-2 text-left whitespace-nowrap cursor-pointer select-none" onClick={() => handleSort('createdAt')}>
                  Data {sort.key === 'createdAt' ? (sort.direction === 'asc' ? <ArrowUp className="inline w-4 h-4 ml-1 text-primary" /> : <ArrowDown className="inline w-4 h-4 ml-1 text-primary" />) : <ArrowUpDown className="inline w-4 h-4 ml-1 text-muted-foreground" />}
                </th>
                <th className="px-4 py-2 text-left whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRequests.map((req) => (
                <tr key={req.id} className="border-b hover:bg-muted/50">
                  <td className="px-4 py-2 whitespace-nowrap">{req.customId || req.id}</td>
                  <td className="px-4 py-2 whitespace-nowrap max-w-xs truncate">{req.title}</td>
                  <td className="px-4 py-2 whitespace-nowrap capitalize">{req.type}</td>
                  <td className="px-4 py-2 whitespace-nowrap capitalize"><StatusBadge status={req.status as 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed'} /></td>
                  <td className="px-4 py-2 whitespace-nowrap max-w-xs truncate">{req.requesterName}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{dayjs(req.createdAt).format('DD/MM/YYYY HH:mm')}</td>
                  <td className="px-4 py-2 whitespace-nowrap space-x-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 rounded hover:bg-muted transition" aria-label="Ações">
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setOpenDetailsId(req.id)}>
                          Visualizar detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setOpenHistoryId(req.id)}>
                          <Clock className="w-4 h-4 mr-2 text-muted-foreground" /> Ver histórico
                        </DropdownMenuItem>
                        {(role === 'admin' || role === 'supervisor') && (
                          <DropdownMenuItem
                            disabled={updateStatusState === 'executing'}
                            onClick={() => executeUpdateStatus({ id: req.id, status: 'in_progress', changedBy: session?.user?.name ?? undefined })}
                          >
                            {updateStatusState === 'executing' ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Info className="w-4 h-4 mr-2 text-blue-500" />
                            )}
                            Atualizar Status para &quot;Em andamento&quot;
                          </DropdownMenuItem>
                        )}
                        {(role === 'admin' || role === 'supervisor') && (
                          <DropdownMenuItem
                            disabled={updateStatusState === 'executing'}
                            onClick={() => executeUpdateStatus({ id: req.id, status: 'approved', changedBy: session?.user?.name ?? undefined })}
                          >
                            {updateStatusState === 'executing' ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                            )}
                            Aprovar
                          </DropdownMenuItem>
                        )}
                        {(role === 'admin' || role === 'supervisor') && (
                          <DropdownMenuItem
                            disabled={updateStatusState === 'executing'}
                            onClick={() => executeUpdateStatus({ id: req.id, status: 'rejected', changedBy: session?.user?.name ?? undefined })}
                          >
                            {updateStatusState === 'executing' ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <XCircle className="w-4 h-4 mr-2 text-red-500" />
                            )}
                            Reprovar
                          </DropdownMenuItem>
                        )}
                        {(role === 'admin' || role === 'encarregado') && (
                          <DropdownMenuItem
                            disabled={updateStatusState === 'executing'}
                            onClick={() => executeUpdateStatus({ id: req.id, status: 'completed', changedBy: session?.user?.name ?? undefined })}
                          >
                            {updateStatusState === 'executing' ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 mr-2 text-primary" />
                            )}
                            Finalizar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Dialog open={openModalId === req.id} onOpenChange={() => { setOpenModalId(null); setSelectedFile(null); setComment(''); }}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Anexar Arquivo à Requisição #{req.id}</DialogTitle>
                        </DialogHeader>
                        <Input type="file" accept=".pdf,image/png,image/jpeg" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
                        <Textarea
                          placeholder="Adicione um comentário (opcional)"
                          className="mt-2"
                          value={comment}
                          onChange={e => setComment(e.target.value)}
                          rows={3}
                        />
                        <DialogFooter>
                          <button
                            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition"
                            onClick={() => {
                              alert(selectedFile ? `Arquivo '${selectedFile.name}' anexado com comentário: '${comment}' (simulado)` : 'Selecione um arquivo!');
                              setOpenModalId(null);
                              setSelectedFile(null);
                              setComment('');
                            }}
                            disabled={!selectedFile}
                          >
                            Anexar
                          </button>
                          <button
                            className="px-4 py-2 bg-muted text-foreground rounded hover:bg-muted/80 transition"
                            onClick={() => { setOpenModalId(null); setSelectedFile(null); setComment(''); }}
                          >
                            Cancelar
                          </button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <RequestDetailsDialog requestId={req.id} open={openDetailsId === req.id} onOpenChange={() => setOpenDetailsId(null)} />
                    <Dialog open={openAddAttachmentId === req.id} onOpenChange={() => { setOpenAddAttachmentId(null); setNewFiles([]); router.refresh(); setOpenDetailsId(null); }}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Adicionar Anexo à Requisição {req.customId || req.id}</DialogTitle>
                        </DialogHeader>
                        <input type="file" multiple accept=".pdf,image/png,image/jpeg" onChange={e => setNewFiles(Array.from(e.target.files ?? []))} />
                        {newFiles.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {newFiles.map((f, idx) => (
                              <li key={f.name + idx} className="flex items-center gap-2 text-sm text-muted-foreground max-w-[220px] truncate">
                                <span className="truncate">{f.name}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        <DialogFooter>
                          <button className="px-4 py-2 bg-muted text-foreground rounded hover:bg-muted/80 transition" onClick={() => { setOpenAddAttachmentId(null); setNewFiles([]); }}>Cancelar</button>
                          <button className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition" disabled={newFiles.length === 0 || (Array.isArray(req.attachments) && req.attachments.length + newFiles.length > MAX_FILES) || isAttachmentLoading} onClick={() => setAttachmentAction({ reqId: req.id, type: 'add' })}>Salvar</button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Dialog open={!!attachmentAction} onOpenChange={open => { if (!open) { setAttachmentAction(null); setAttachmentComment(''); } }}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{attachmentAction?.type === 'add' ? 'Adicionar Anexo' : 'Remover Anexo'}</DialogTitle>
                        </DialogHeader>
                        <Textarea
                          placeholder="Descreva o motivo (obrigatório)"
                          value={attachmentComment}
                          onChange={e => setAttachmentComment(e.target.value)}
                          rows={3}
                          className="mb-2"
                        />
                        <DialogFooter>
                          <button className="px-4 py-2 bg-muted text-foreground rounded hover:bg-muted/80 transition" onClick={() => { setAttachmentAction(null); setAttachmentComment(''); }}>Cancelar</button>
                          <button className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition" disabled={!attachmentComment.trim() || isAttachmentLoading} onClick={async () => {
                            setIsAttachmentLoading(true);
                            if (attachmentAction?.type === 'add') {
                              // Upload dos arquivos
                              const uploaded: { filename: string, uploadedBy: string }[] = [];
                              for (const file of newFiles) {
                                if (file.size > 10 * 1024 * 1024) {
                                  toast.error(`O arquivo ${file.name} excede 10MB.`, { icon: <XCircle className="text-red-500" /> });
                                  setIsAttachmentLoading(false);
                                  return;
                                }
                                const formData = new FormData();
                                formData.append('file', file);
                                const res = await fetch('/api/upload', { method: 'POST', body: formData });
                                if (!res.ok) {
                                  toast.error(`Falha ao enviar o arquivo ${file.name}.`, { icon: <XCircle className="text-red-500" /> });
                                  setIsAttachmentLoading(false);
                                  return;
                                }
                                const data = await res.json();
                                uploaded.push({ filename: data.filename, uploadedBy: session?.user?.name ?? 'Desconhecido' });
                              }
                              const newAttachments = [...(req.attachments || []), ...uploaded].slice(0, MAX_FILES);
                              await updateRequestAttachments({
                                id: req.id,
                                attachments: newAttachments,
                                changedBy: session?.user?.name ?? 'Desconhecido',
                                comment: attachmentComment,
                                action: 'add',
                              }).then((data) => {
                                if (data && data.success) toast.success(data.success, { icon: <CheckCircle2 className="text-green-500" /> });
                                if (data && data.error) toast.error(data.error, { icon: <XCircle className="text-red-500" /> });
                              });
                              setNewFiles([]);
                            } else if (attachmentAction?.type === 'remove' && attachmentAction.att) {
                              const attachmentsArr = Array.isArray(req.attachments) ? req.attachments as { filename: string, uploadedBy: string }[] : [];
                              const filtered = attachmentsArr.filter(a => a.filename !== attachmentAction.att!.filename || a.uploadedBy !== attachmentAction.att!.uploadedBy);
                              await updateRequestAttachments({
                                id: req.id,
                                attachments: filtered,
                                changedBy: session?.user?.name ?? 'Desconhecido',
                                comment: attachmentComment,
                                action: 'remove',
                              }).then((data) => {
                                if (data && data.success) toast.success(data.success, { icon: <CheckCircle2 className="text-green-500" /> });
                                if (data && data.error) toast.error(data.error, { icon: <XCircle className="text-red-500" /> });
                              });
                            }
                            setIsAttachmentLoading(false);
                            setAttachmentAction(null);
                            setAttachmentComment('');
                            setOpenAddAttachmentId(null);
                          }}>Confirmar</button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Dialog open={openHistoryId === req.id} onOpenChange={() => setOpenHistoryId(null)}>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Histórico de Status</DialogTitle>
                        </DialogHeader>
                        <div className="py-2">
                          {Array.isArray(req.statusHistory) && req.statusHistory.length > 0 ? (
                            <ol className="relative border-l border-muted-foreground/30 ml-2">
                              {req.statusHistory.map((h, idx) => (
                                <li key={idx} className="mb-6 ml-4">
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
                                      <div className="mt-1 text-xs italic text-muted-foreground">Comentário: {h.comment}</div>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ol>
                          ) : (
                            <div className="text-sm text-muted-foreground">Nenhum histórico registrado para esta requisição.</div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </td>
                </tr>
              ))}
            </tbody>
          </motion.table>
        </AnimatePresence>
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-muted-foreground">
            Exibindo {paginatedRequests.length} de {filteredRequests.length} requisições
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              Anterior
            </Button>
            <span className="text-sm px-2">Página {page} de {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Próxima
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 