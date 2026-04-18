"use client";

// Subscription payment history page, accessible from settings Subscription tab

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { api } from "@/lib/api";
import { Loading } from "@/components/loading";
import { EmptyState } from "@/components/empty-state";
import { ErrorDisplay } from "@/components/error-display";
import { cn, formatDate, formatCurrency } from "@/lib/utils";
import { Star } from "lucide-react";
import type { Subscription } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-500/20 text-green-400 border border-green-500/40",
  CANCELLED: "bg-orange-500/20 text-orange-400 border border-orange-500/40",
  EXPIRED: "bg-red-500/20 text-red-400 border border-red-500/40",
  PENDING: "bg-blue-500/20 text-blue-400 border border-blue-500/40",
};

export default function SubscriptionHistoryPage() {
  const router = useRouter();

  const {
    data: subscriptions = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["subscriptionHistory"],
    queryFn: api.getSubscriptionHistory,
  });

  return (
    <div className="flex flex-col h-full">
      <div className="arena-header px-2 py-3 flex items-center gap-2 shrink-0">
        <button
          onClick={() => router.back()}
          className="p-1.5 text-[#c9a84c] hover:text-[#d4b04a]"
          aria-label="Go back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-sm font-bold text-[#c9a84c] uppercase tracking-wider">
          Subscription History
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {isLoading && <Loading message="Loading subscription history..." />}
        {error && <ErrorDisplay message={String(error)} onRetry={refetch} />}
        {!isLoading && !error && subscriptions.length === 0 && (
          <EmptyState message="No subscription history" icon={Star} />
        )}
        {subscriptions.map((sub) => (
          <div key={sub.id} className="panel-dark p-4 mb-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-base font-bold text-[#c9a84c]">{sub.tier}</p>
              <span
                className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider",
                  STATUS_COLORS[sub.status] ??
                    "bg-[#2a2620] text-[#8a8a8a] border border-[#3a3530]",
                )}
              >
                {sub.status}
              </span>
            </div>
            {sub.billingPeriod && (
              <p className="text-xs text-[#8a8a8a] mb-1">
                Billing: {sub.billingPeriod}
              </p>
            )}
            {sub.currentPeriodStart && (
              <p className="text-xs text-[#6a6a6a]">
                Start: {formatDate(sub.currentPeriodStart)}
              </p>
            )}
            {sub.currentPeriodEnd && (
              <p className="text-xs text-[#6a6a6a]">
                End: {formatDate(sub.currentPeriodEnd)}
              </p>
            )}
            {sub.cancelAtPeriodEnd && (
              <p className="text-xs text-orange-400 mt-1">
                Cancels at period end
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
