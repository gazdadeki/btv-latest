"use client";

// Wallet transaction history page, accessible from settings Wallet tab

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, TrendingUp, TrendingDown } from "lucide-react";
import { api } from "@/lib/api";
import { Loading } from "@/components/loading";
import { EmptyState } from "@/components/empty-state";
import { ErrorDisplay } from "@/components/error-display";
import { cn, formatDateTime, formatNumber } from "@/lib/utils";
import { transactionIsPositive, type Transaction } from "@/types";

const PAGE_SIZE = 25;

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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async (targetPage: number) => {
    setIsFetching(true);
    setError(null);
    try {
      const res = await api.getWalletTransactions(targetPage, PAGE_SIZE);
      setTransactions((prev) =>
        targetPage === 1 ? res.transactions : [...prev, ...res.transactions],
      );
      setTotal(res.total);
      setPage(targetPage);
    } catch (err) {
      setError(err);
    } finally {
      setIsFetching(false);
      setIsInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  const isLoading = isInitialLoading;
  const canLoadMore = transactions.length < total;

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
        {error && (
          <ErrorDisplay message={String(error)} onRetry={() => load(1)} />
        )}
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
        {!isLoading && canLoadMore && (
          <button
            type="button"
            onClick={() => load(page + 1)}
            disabled={isFetching}
            className="w-full btn-dark-secondary mt-2 py-3 text-sm font-bold uppercase tracking-wider disabled:opacity-60"
          >
            {isFetching ? "Loading..." : "Load more"}
          </button>
        )}
      </div>
    </div>
  );
}
