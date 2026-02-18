interface StatusBadgeProps {
  status: string;
  colorMap: Record<string, string>;
  fallback?: string;
}

export function StatusBadge({
  status,
  colorMap,
  fallback = 'bg-gray-100 text-gray-600',
}: StatusBadgeProps) {
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${colorMap[status] || fallback}`}
    >
      {status}
    </span>
  );
}
