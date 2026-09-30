import { Mail } from 'lucide-react';

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: { icon: 'w-7 h-7', text: 'text-base', padding: 'p-1.5' },
    md: { icon: 'w-9 h-9', text: 'text-lg', padding: 'p-2' },
    lg: { icon: 'w-12 h-12', text: 'text-2xl', padding: 'p-2.5' },
  };
  const s = sizes[size];

  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`${s.padding} bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-sm flex items-center justify-center`}
      >
        <Mail className={`${s.icon} text-white`} strokeWidth={2.5} />
      </div>
      <span className={`${s.text} font-bold text-gray-900 tracking-tight`}>
        Reach<span className="text-blue-600">Inbox</span>
      </span>
    </div>
  );
}
