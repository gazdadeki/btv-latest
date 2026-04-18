"use client";

// Wallet transaction history page, accessible from settings Wallet tab

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, TrendingUp, TrendingDown } from "lucide-react";
import { api } from "@/lib/api";
import { Loading } from "@/components/loading";
import { EmptyState } from "@/components/empty-state";
import { ErrorDisplay } from "@/components/error-display";
import { cn, formatDateTime, formatNumber } from "@/lib/utils";
import { transactionIsPositive } from "@/types";

const TYPE_LABELS: Record<string, string> = {
  DEPOSIT: "Deposit",
  WITHDRAWAL: "Withdrawal",
  RESERVATIONCOST: "Reservation",
  CONFIRMATIONCOST: "Confirmation",
  REFUND: "Refund",
  REWARD: "Reward",
  STRIPEPURCHASE: "Purchase",
};

export default function WalletTransactionsPage() {
  const router = useRouter();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["walletTransactions"],
    queryFn: () => api.getWalletTransactions(1, 100),
  });

  const transactions = data?.transactions ?? [];

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
          Transaction History
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {isLoading && <Loading message="Loading transactions..." />}
        {error && <ErrorDisplay message={String(error)} onRetry={refetch} />}
        {!isLoading && !error && transactions.length === 0 && (
          <EmptyState message="No transactions yet" />
        )}
        {transactions.map((t) => {
          const isPositive = transactionIsPositive(t);
          return (
            <div
              key={t.id}
              className="panel-dark p-3 mb-2 flex items-center gap-3"
            >
              <div
                className={cn(
                  "p-2 rounded-full shrink-0",
                  isPositive ? "bg-green-500/15" : "bg-red-500/15",
                )}
              >
                {isPositive ? (
                  <TrendingUp className="w-4 h-4 text-green-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#e0d8c8]">
                  {TYPE_LABELS[t.type] ?? t.type}
                </p>
                {t.description && (
                  <p className="text-xs text-[#8a8a8a] truncate">
                    {t.description}
                  </p>
                )}
                <p className="text-xs text-[#6a6a6a]">
                  {formatDateTime(t.createdAt)}
                </p>
              </div>
              <p
                className={cn(
                  "text-sm font-bold shrink-0",
                  isPositive ? "text-green-400" : "text-red-400",
                )}
              >
                {isPositive ? "+" : "-"}
                {formatNumber(Math.abs(t.amount))}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
