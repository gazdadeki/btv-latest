"use client";

// Translated from Mobile/lib/features/shop/pages/shop_page.dart
// Two tabs: Subscriptions and Coins
// Subscription flow: create intent → confirm via Stripe Elements → refresh subscription
// Coin pack flow: create payment intent → present via Stripe Elements → sync backend → refresh wallet

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useStripe,
  useElements,
  PaymentElement,
} from "@stripe/react-stripe-js";
import { CreditCard, Star, Coins, X, Loader2, Layers3 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Loading } from "@/components/loading";
import { EmptyState } from "@/components/empty-state";
import { ErrorDisplay } from "@/components/error-display";
import { Button } from "@/components/button";
import { PageHeader } from "@/components/page-header";
import { GiShop } from "react-icons/gi";
import { cn, formatCurrency } from "@/lib/utils";
import type { Product, PaymentMethod } from "@/types";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
);

// ─── Payment method selector modal ─────────────────────────────────────────────
function PaymentMethodSelector({
  onSelect,
  onClose,
}: {
  onSelect: (id: string | "add_new") => void;
  onClose: () => void;
}) {
  const {
    data: methods = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["paymentMethods"],
    queryFn: api.getPaymentMethods,
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="panel-dark relative w-full max-w-sm max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[#2a2620]">
          <h2 className="text-sm font-bold text-[#c9a84c] uppercase tracking-wider">
            Select Payment Method
          </h2>
          <button
            onClick={onClose}
            className="text-[#6a6a6a] hover:text-[#c0c0c0]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading && <Loading message="Loading payment methods..." />}
          {error && <ErrorDisplay message={String(error)} onRetry={refetch} />}
          {!isLoading && !error && (
            <>
              {methods.length === 0 && (
                <div className="px-4 py-3 text-sm text-[#8a8a8a]">
                  No saved payment methods
                </div>
              )}
              {methods.map((m) => (
                <button
                  key={m.id}
                  onClick={() => onSelect(m.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1a1816] border-b border-[#2a2620] last:border-0"
                >
                  <CreditCard className="w-5 h-5 text-[#6a6a6a] shrink-0" />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-[#f0f0f0]">
                      **** **** **** {m.last4}
                      {m.isDefault && (
                        <span className="ml-2 text-[10px] bg-green-700/30 text-green-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                          Default
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-[#8a8a8a]">
                      {m.brand.toUpperCase()} · Exp{" "}
                      {String(m.expMonth).padStart(2, "0")}/
                      {String(m.expYear).slice(-2)}
                    </p>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>

        <div className="p-4 border-t border-[#2a2620]">
          <button
            onClick={() => onSelect("add_new")}
            className="btn-dark-secondary w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium min-h-[48px]"
          >
            <CreditCard className="w-4 h-4" />
            Add New Payment Method
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Stripe payment sheet modal ─────────────────────────────────────────────────
function PaymentSheet({
  clientSecret,
  onSuccess,
  onClose,
  label,
}: {
  clientSecret: string;
  onSuccess: () => void;
  onClose: () => void;
  label: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  async function handleConfirm() {
    if (!stripe || !elements) return;
    setIsProcessing(true);
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });
      if (error) throw new Error(error.message);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative panel-dark w-full max-w-lg mx-auto rounded-b-none rounded-t-2xl p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-[#c9a84c] uppercase tracking-wider">
            {label}
          </h2>
          <button
            onClick={onClose}
            className="text-[#6a6a6a] hover:text-[#c0c0c0]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PaymentElement />
        </Elements>
        <div className="mt-5">
          <Button
            size="full"
            onClick={handleConfirm}
            disabled={isProcessing || !stripe}
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Pay Now"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Subscription card ─────────────────────────────────────────────────────────
function SubscriptionCard({ product }: { product: Product }) {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMethodSelector, setShowMethodSelector] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const intentMutation = useMutation({
    mutationFn: (paymentMethodId?: string) =>
      api.createSubscriptionIntent(product.id, paymentMethodId),
  });

  async function handleMethodSelected(methodId: string | "add_new") {
    setShowMethodSelector(false);
    setIsProcessing(true);
    try {
      const pmId = methodId === "add_new" ? undefined : methodId;
      const result = await intentMutation.mutateAsync(pmId);

      if (result.clientSecret) {
        if (pmId) {
          // Confirm with saved method directly
          const stripe = await stripePromise;
          if (!stripe) throw new Error("Stripe not loaded");
          const { error } = await stripe.confirmCardPayment(
            result.clientSecret,
            {
              payment_method: pmId,
            },
          );
          if (error) throw new Error(error.message);
          toast.success("Subscription activated!");
          queryClient.invalidateQueries({ queryKey: ["currentSubscription"] });
        } else {
          // Show sheet for new card
          setClientSecret(result.clientSecret);
          return;
        }
      } else {
        toast.success("Subscription created. Activation pending.");
        queryClient.invalidateQueries({ queryKey: ["currentSubscription"] });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Subscription failed");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <>
      <div className="panel-dark p-4 mb-3">
        <div className="flex items-start gap-2 mb-3">
          <Star className="w-5 h-5 text-[#c9a84c] fill-[#c9a84c] shrink-0 mt-0.5" />
          <div>
            <p className="text-base font-bold text-[#f0f0f0]">{product.name}</p>
            {product.description && (
              <p className="text-xs text-[#8a8a8a] mt-0.5">
                {product.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-[#c9a84c]">
              {formatCurrency((product.productData.price ?? 0) / 100)}
            </p>
            {product.productData.billingPeriod && (
              <p className="text-xs text-[#8a8a8a]">
                per {product.productData.billingPeriod.toLowerCase()}
              </p>
            )}
          </div>
          <Button
            onClick={() => setShowMethodSelector(true)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Subscribe"
            )}
          </Button>
        </div>
      </div>

      {showMethodSelector && (
        <PaymentMethodSelector
          onSelect={handleMethodSelected}
          onClose={() => setShowMethodSelector(false)}
        />
      )}
      {clientSecret && (
        <PaymentSheet
          clientSecret={clientSecret}
          label={`Subscribe to ${product.name}`}
          onSuccess={() => {
            setClientSecret(null);
            toast.success("Subscription activated!");
            queryClient.invalidateQueries({
              queryKey: ["currentSubscription"],
            });
          }}
          onClose={() => setClientSecret(null)}
        />
      )}
    </>
  );
}

// ─── Coin pack card ─────────────────────────────────────────────────────────────
function CoinPackCard({ product }: { product: Product }) {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMethodSelector, setShowMethodSelector] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  function extractIntentId(secret: string): string {
    return secret.split("_secret_")[0];
  }

  async function syncAndRefresh(clientSecret: string) {
    const intentId = extractIntentId(clientSecret);
    try {
      await api.syncPaymentStatus(intentId);
    } catch {
      /* ignore */
    }
    queryClient.invalidateQueries({ queryKey: ["walletBalance"] });
    queryClient.invalidateQueries({ queryKey: ["walletTransactions"] });
  }

  async function handleMethodSelected(methodId: string | "add_new") {
    setShowMethodSelector(false);
    setIsProcessing(true);
    try {
      const pmId = methodId === "add_new" ? undefined : methodId;
      const secret = await api.createPaymentIntent(product.id, pmId);

      if (pmId) {
        const stripe = await stripePromise;
        if (!stripe) throw new Error("Stripe not loaded");
        const { error, paymentIntent } = await stripe.confirmCardPayment(
          secret,
          {
            payment_method: pmId,
          },
        );
        if (error) throw new Error(error.message);
        if (paymentIntent?.status === "succeeded") {
          await syncAndRefresh(secret);
          toast.success("Purchase successful! Coins added to your wallet.");
        } else {
          toast.info("Payment is processing. Coins will be added shortly.");
        }
      } else {
        setClientSecret(secret);
        return;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Purchase failed");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <>
      <div className="panel-dark p-4 mb-3">
        <div className="flex items-start gap-2 mb-3">
          <Coins className="w-5 h-5 text-[#2a9d8f] shrink-0 mt-0.5" />
          <div>
            <p className="text-base font-bold text-[#f0f0f0]">{product.name}</p>
            {product.description && (
              <p className="text-xs text-[#8a8a8a] mt-0.5">
                {product.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-[#f0f0f0]">
              {product.productData.coins ?? 0} Coins
            </p>
            <p className="text-lg font-bold text-[#c9a84c]">
              {formatCurrency((product.productData.price ?? 0) / 100)}
            </p>
          </div>
          <Button
            onClick={() => setShowMethodSelector(true)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Purchase"
            )}
          </Button>
        </div>
      </div>

      {showMethodSelector && (
        <PaymentMethodSelector
          onSelect={handleMethodSelected}
          onClose={() => setShowMethodSelector(false)}
        />
      )}
      {clientSecret && (
        <PaymentSheet
          clientSecret={clientSecret}
          label={`Buy ${product.name}`}
          onSuccess={async () => {
            await syncAndRefresh(clientSecret);
            setClientSecret(null);
            toast.success("Purchase successful! Coins added to your wallet.");
          }}
          onClose={() => setClientSecret(null)}
        />
      )}
    </>
  );
}

// ─── Shop page ─────────────────────────────────────────────────────────────────
export default function ShopPage() {
  const [activeTab, setActiveTab] = useState<"subscriptions" | "coins">(
    "subscriptions",
  );

  const {
    data: products = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["products"],
    queryFn: api.getProducts,
  });

  const subscriptions = products.filter(
    (p) => p.type === "SUBSCRIPTION" && p.isActive && !p.isArchived,
  );
  const coinPacks = products.filter(
    (p) => p.type === "COIN_PACK" && p.isActive && !p.isArchived,
  );

  const tabs = [
    { key: "subscriptions" as const, label: "Subscriptions", icon: Layers3 },
    { key: "coins" as const, label: "Coins", icon: Coins },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <PageHeader label="Store" icon={GiShop} />

      {/* Tabs */}
      <div className="flex border-b border-[#2a2620] shrink-0">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors",
              activeTab === key
                ? "border-[#c9a84c] text-[#c9a84c]"
                : "border-transparent text-[#7a7366] hover:text-[#a89f8e]",
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {isLoading && <Loading message="Loading products..." />}
        {error && <ErrorDisplay message={String(error)} onRetry={refetch} />}

        {!isLoading &&
          !error &&
          activeTab === "subscriptions" &&
          (subscriptions.length === 0 ? (
            <EmptyState
              message="No subscription products available"
              icon={Layers3}
            />
          ) : (
            subscriptions.map((p) => (
              <SubscriptionCard key={p.id} product={p} />
            ))
          ))}
        {!isLoading &&
          !error &&
          activeTab === "coins" &&
          (coinPacks.length === 0 ? (
            <EmptyState message="No coin packs available" icon={Coins} />
          ) : (
            coinPacks.map((p) => <CoinPackCard key={p.id} product={p} />)
          ))}
      </div>
    </div>
  );
}
