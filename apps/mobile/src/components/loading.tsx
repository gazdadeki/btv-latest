import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingProps {
  message?: string;
  className?: string;
}

export function Loading({ message = 'Loading...', className }: LoadingProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 gap-3', className)}>
      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}
