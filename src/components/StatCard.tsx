import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  color: 'blue' | 'emerald' | 'amber' | 'red' | 'gray';
  isLoading?: boolean;
}

const colorConfig = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', ring: 'ring-blue-100' },
  emerald: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    ring: 'ring-emerald-100',
  },
  amber: {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    ring: 'ring-amber-100',
  },
  red: { bg: 'bg-red-50', text: 'text-red-600', ring: 'ring-red-100' },
  gray: { bg: 'bg-gray-100', text: 'text-gray-600', ring: 'ring-gray-100' },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  color,
  isLoading,
}: StatCardProps) {
  const c = colorConfig[color];
  return (
    <div className="card p-5 flex items-center gap-4">
      <div
        className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center ring-4',
          c.bg,
          c.text,
          c.ring
        )}
      >
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 font-medium truncate">{label}</p>
        {isLoading ? (
          <div className="h-7 w-16 bg-gray-200 rounded animate-pulse mt-1" />
        ) : (
          <p className={cn('text-2xl font-bold text-gray-900 mt-0.5')}>
            {value.toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}
