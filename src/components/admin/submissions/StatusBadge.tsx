import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  new: {
    label: 'New',
    className: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  },
  reviewed: {
    label: 'Reviewed',
    className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  },
  contacted: {
    label: 'Contacted',
    className: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
  },
  closed: {
    label: 'Closed',
    className: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
  },
  junk: {
    label: 'Junk',
    className: 'bg-red-100 text-red-800 hover:bg-red-100',
  },
};

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const config = statusConfig[status] || statusConfig.new;
  
  return (
    <Badge variant="outline" className={cn('border-0', config.className)}>
      {config.label}
    </Badge>
  );
};
