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
  return (
    <Badge
      className={
        `${color} shadow-md border-2 border-white/70 animate-fade-in transition-transform duration-150 hover:scale-105 focus-visible:scale-105 focus-visible:ring-2 focus-visible:ring-ring/50`
      }
      tabIndex={0}
      aria-label={`Status: ${label}`}
    >
      {label}
    </Badge>
  );
} 