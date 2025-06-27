"use client";
import React, { useState, useMemo } from 'react';
import { Request } from '@/db/schema';
import dayjs from 'dayjs';
import { StatusBadge } from './StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');

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
              <th className="px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">Título</th>
              <th className="px-4 py-2 text-left">Tipo</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Solicitante</th>
              <th className="px-4 py-2 text-left">Data</th>
              <th className="px-4 py-2 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.map((req) => (
              <tr key={req.id} className="border-b hover:bg-muted/50">
                <td className="px-4 py-2">{req.id}</td>
                <td className="px-4 py-2">{req.title}</td>
                <td className="px-4 py-2 capitalize">{req.type}</td>
                <td className="px-4 py-2 capitalize"><StatusBadge status={req.status} /></td>
                <td className="px-4 py-2">{req.requesterName}</td>
                <td className="px-4 py-2">{dayjs(req.createdAt).format('DD/MM/YYYY HH:mm')}</td>
                <td className="px-4 py-2 space-x-2">
                  <button className="text-blue-600 hover:underline text-sm" onClick={() => alert(`Detalhes da requisição #${req.id}`)}>Detalhes</button>
                  <button className="text-green-600 hover:underline text-sm" onClick={() => alert(`Atualizar status da requisição #${req.id}`)}>Atualizar Status</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 