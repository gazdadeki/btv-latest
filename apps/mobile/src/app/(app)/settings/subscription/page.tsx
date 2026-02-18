'use client';

// Subscription payment history page, accessible from settings Subscription tab

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { Loading } from '@/components/loading';
import { EmptyState } from '@/components/empty-state';
import { ErrorDisplay } from '@/components/error-display';
import { cn, formatDate, formatCurrency } from '@/lib/utils';
import { Star } from 'lucide-react';
import type { Subscription } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:    'bg-green-100 text-green-700',
  CANCELLED: 'bg-orange-100 text-orange-700',
  EXPIRED:   'bg-red-100 text-red-700',
  PENDING:   'bg-blue-100 text-blue-700',
};

export default function SubscriptionHistoryPage() {
  const router = useRouter();

  const { data: subscriptions = [], isLoading, error, refetch } = useQuery({
    queryKey: ['subscriptionHistory'],
    queryFn: api.getSubscriptionHistory,
  });

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-2 py-3 flex items-center gap-2 shrink-0">
        <button onClick={() => router.back()} className="p-1.5 text-gray-500">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-sm font-bold text-gray-900">Subscription History</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {isLoading && <Loading message="Loading subscription history..." />}
        {error && <ErrorDisplay message={String(error)} onRetry={refetch} />}
        {!isLoading && !error && subscriptions.length === 0 && (
          <EmptyState message="No subscription history" icon={Star} />
        )}
        {subscriptions.map(sub => (
          <div key={sub.id} className="bg-white border border-gray-200 rounded-xl p-4 mb-3 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-base font-bold text-amber-500">{sub.tier}</p>
              <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', STATUS_COLORS[sub.status] ?? 'bg-gray-100 text-gray-600')}>
                {sub.status}
              </span>
            </div>
            {sub.billingPeriod && (
              <p className="text-xs text-gray-500 mb-1">Billing: {sub.billingPeriod}</p>
            )}
            {sub.currentPeriodStart && (
              <p className="text-xs text-gray-400">Start: {formatDate(sub.currentPeriodStart)}</p>
            )}
            {sub.currentPeriodEnd && (
              <p className="text-xs text-gray-400">End: {formatDate(sub.currentPeriodEnd)}</p>
            )}
            {sub.cancelAtPeriodEnd && (
              <p className="text-xs text-orange-600 mt-1">Cancels at period end</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
