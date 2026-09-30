export function LoadingSpinner({ size = 20 }: { size?: number }) {
  return (
    <div
      className="animate-spin rounded-full border-2 border-gray-200 border-t-blue-600"
      style={{ width: size, height: size }}
    />
  );
}

export function FullPageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full border-3 border-gray-200 border-t-blue-600 w-10 h-10" />
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4">
          <div className="h-4 bg-gray-200 rounded animate-pulse flex-1 max-w-[200px]" />
          <div className="h-4 bg-gray-200 rounded animate-pulse flex-1 max-w-[150px]" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
          <div className="h-6 bg-gray-200 rounded-full animate-pulse w-20" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm mb-4">{description}</p>
      {action}
    </div>
  );
}
