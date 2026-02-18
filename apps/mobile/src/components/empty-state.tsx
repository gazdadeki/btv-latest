import { type LucideIcon, InboxIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  message: string;
  icon?: LucideIcon;
  className?: string;
}

export function EmptyState({ message, icon: Icon = InboxIcon, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 gap-3 text-center px-4', className)}>
      <Icon className="w-12 h-12 text-gray-300" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}
