import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: 'pending' | 'need_approved' | 'finance_approved' | 'awaiting_delivery' | 'rejected' | 'in_progress' | 'completed';
}

const statusMap = {
  pending: { label: 'PR Pending', color: 'bg-yellow-400 text-black' },
  need_approved: { label: 'PR Approved', color: 'bg-blue-400 text-white' },
  finance_approved: { label: 'PO Approved', color: 'bg-green-500 text-white' },
  awaiting_delivery: { label: 'Awaiting Delivery', color: 'bg-orange-400 text-white' },
  rejected: { label: 'Rejected', color: 'bg-red-500 text-white' },
  in_progress: { label: 'In Progress', color: 'bg-purple-500 text-white' },
  completed: { label: 'Completed', color: 'bg-gray-500 text-white' },
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