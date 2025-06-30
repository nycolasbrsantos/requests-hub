"use client";
import React, { useState, useMemo } from 'react';
import { Request } from '@/db/schema';
import dayjs from 'dayjs';
import { StatusBadge } from './StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Paperclip } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useSession } from 'next-auth/react';
import { useAction } from 'next-safe-action/hooks';
import { updateRequestStatus } from '@/actions/update-request-status';
import { toast } from 'sonner';

interface RequestsTableProps {
  requests: Request[];
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

export default function RequestsTable({ requests }: RequestsTableProps) {
  const { data: session } = useSession();
  const role = session?.user.role;
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [openModalId, setOpenModalId] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [comment, setComment] = useState('');

  const { execute: updateStatus, status: updating } = useAction(updateRequestStatus, {
    onSuccess: (data) => {
      if (data?.data?.success) toast.success(data.data.success);
      if (data?.data?.error) toast.error(data.data.error);
    },
    onError: () => toast.error('Erro ao atualizar status.'),
  });

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const statusMatch = status === 'all' ? true : req.status === status;
      const typeMatch = type === 'all' ? true : req.type === type;
      return statusMatch && typeMatch;
    });
  }, [requests, status, type]);

  if (!requests || requests.length === 0) {
    return (
      <div className="border rounded-md p-4 bg-white dark:bg-zinc-900">
        <p className="text-center text-muted-foreground">Nenhuma requisição encontrada.</p>
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
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            {typeOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border rounded-md bg-white dark:bg-zinc-900">
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
            {filteredRequests.map((req) => (
              <tr key={req.id} className="border-b hover:bg-muted/50">
                <td className="px-4 py-2 whitespace-nowrap">{req.customId || req.id}</td>
                <td className="px-4 py-2 whitespace-nowrap max-w-xs truncate">{req.title}</td>
                <td className="px-4 py-2 whitespace-nowrap capitalize">{req.type}</td>
                <td className="px-4 py-2 whitespace-nowrap capitalize"><StatusBadge status={req.status} /></td>
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
                      <DropdownMenuItem onClick={() => toast.info(`Detalhes da requisição #${req.id}`)}>
                        Detalhes
                      </DropdownMenuItem>
                      {(role === 'admin' || role === 'supervisor') && (
                        <DropdownMenuItem onClick={() => updateStatus({ id: req.id, status: 'in_progress' })} disabled={updating === 'executing'}>
                          Atualizar Status para &quot;Em andamento&quot;
                        </DropdownMenuItem>
                      )}
                      {(role === 'admin' || role === 'supervisor') && (
                        <DropdownMenuItem onClick={() => updateStatus({ id: req.id, status: 'approved' })} disabled={updating === 'executing'}>
                          Aprovar
                        </DropdownMenuItem>
                      )}
                      {(role === 'admin' || role === 'supervisor') && (
                        <DropdownMenuItem onClick={() => updateStatus({ id: req.id, status: 'rejected' })} disabled={updating === 'executing'}>
                          Reprovar
                        </DropdownMenuItem>
                      )}
                      {(role === 'admin' || role === 'encarregado') && (
                        <DropdownMenuItem onClick={() => updateStatus({ id: req.id, status: 'completed' })} disabled={updating === 'executing'}>
                          Finalizar
                        </DropdownMenuItem>
                      )}
                      {(role === 'admin' || role === 'supervisor' || role === 'encarregado' || (role === 'user' && req.requesterName === session?.user.name)) && (
                        <DropdownMenuItem onClick={() => setOpenModalId(req.id)}>
                          <Paperclip className="w-4 h-4 mr-2" />
                          Anexar Arquivo
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 