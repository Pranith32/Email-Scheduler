import type { EmailJobStatus } from '@/types';
import { cn } from '@/lib/utils';

const statusConfig: Record<
  EmailJobStatus,
  { label: string; classes: string; dot: string }
> = {
  scheduled: {
    label: 'Scheduled',
    classes: 'bg-blue-50 text-blue-700 border border-blue-200',
    dot: 'bg-blue-500',
  },
  processing: {
    label: 'Processing',
    classes: 'bg-amber-50 text-amber-700 border border-amber-200',
    dot: 'bg-amber-500',
  },
  sent: {
    label: 'Sent',
    classes: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    dot: 'bg-emerald-500',
  },
  failed: {
    label: 'Failed',
    classes: 'bg-red-50 text-red-700 border border-red-200',
    dot: 'bg-red-500',
  },
  cancelled: {
    label: 'Cancelled',
    classes: 'bg-gray-100 text-gray-600 border border-gray-200',
    dot: 'bg-gray-400',
  },
};

export function StatusBadge({ status }: { status: EmailJobStatus }) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        config.classes
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  );
}
