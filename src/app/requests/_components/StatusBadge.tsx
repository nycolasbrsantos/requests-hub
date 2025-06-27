import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed';
}

const statusMap = {
  pending: { label: 'Pendente', color: 'bg-yellow-400 text-black' },
  approved: { label: 'Aprovada', color: 'bg-green-500 text-white' },
  rejected: { label: 'Rejeitada', color: 'bg-red-500 text-white' },
  in_progress: { label: 'Em andamento', color: 'bg-blue-500 text-white' },
  completed: { label: 'Concluída', color: 'bg-gray-500 text-white' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, color } = statusMap[status] || { label: status, color: 'bg-muted' };
  return <Badge className={color}>{label}</Badge>;
} 