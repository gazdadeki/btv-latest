import { AlertCircle } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface ErrorDisplayProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorDisplay({ message, onRetry, className }: ErrorDisplayProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 gap-3 text-center px-4', className)}>
      <AlertCircle className="w-10 h-10 text-red-400" />
      <p className="text-sm text-red-600">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
