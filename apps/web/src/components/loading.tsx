import { cn } from '@/lib/utils';

export function Loading({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center py-12', className)}>
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-indigo-600" />
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-indigo-600" />
    </div>
  );
}
