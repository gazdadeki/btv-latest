'use client';

// Translated from Mobile/lib/shared/widgets/bottom_nav_bar.dart (_WebSocketStatusBar)
// Hidden when connected. Tap to retry when disconnected/error.

import { CloudOff, AlertCircle, Loader2 } from 'lucide-react';
import { type WebSocketStatus, wsManager } from '@/lib/websocket';
import { cn } from '@/lib/utils';

interface WebSocketStatusBarProps {
  status: WebSocketStatus;
}

export function WebSocketStatusBar({ status }: WebSocketStatusBarProps) {
  if (status === 'connected') return null;

  const config = {
    connecting: {
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      message: 'Connecting...',
      tappable: false,
      icon: null,
    },
    disconnected: {
      bg: 'bg-orange-50',
      text: 'text-orange-600',
      message: 'Disconnected',
      tappable: true,
      icon: CloudOff,
    },
    error: {
      bg: 'bg-red-50',
      text: 'text-red-600',
      message: 'Connection error',
      tappable: true,
      icon: AlertCircle,
    },
  }[status];

  if (!config) return null;

  const Icon = config.icon;

  return (
    <div
      className={cn('w-full px-4 py-1.5 flex items-center justify-center gap-2', config.bg, config.tappable && 'cursor-pointer')}
      onClick={config.tappable ? () => wsManager.retry() : undefined}
    >
      {status === 'connecting' ? (
        <Loader2 className={cn('w-3 h-3 animate-spin', config.text)} />
      ) : Icon ? (
        <Icon className={cn('w-3 h-3', config.text)} />
      ) : null}
      <span className={cn('text-xs font-medium', config.text)}>{config.message}</span>
      {config.tappable && (
        <span className={cn('text-xs opacity-70', config.text)}>· Tap to retry</span>
      )}
    </div>
  );
}
