"use client";

// Translated from Mobile/lib/features/settings/
// 6 tabs: Profile, Wallet, Statistics, Subscription, Payment Methods, Notifications
// Each tab is a section of this page (tab-based layout, mobile-friendly horizontal scroll)

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Wallet,
  BarChart2,
  Star,
  CreditCard,
  Bell,
  Edit2,
  Check,
  X,
  Loader2,
  Plus,
  Trash2,
  LogOut,
  TrendingUp,
  TrendingDown,
  Trophy,
  ThumbsDown,
  Gamepad2,
  Coins,
  ArrowUpRight,
  AlertCircle,
  History,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  useStripe,
  useElements,
  PaymentElement,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Loading } from "@/components/loading";
import { EmptyState } from "@/components/empty-state";
import { ErrorDisplay } from "@/components/error-display";
import { Button } from "@/components/button";
import { PageHeader } from "@/components/page-header";
import { GiGearHammer } from "react-icons/gi";
import { cn, formatDate, formatCurrency, formatNumber } from "@/lib/utils";
import { winRate, totalGamesPlayed, netCoins } from "@/types";
import type { PaymentMethod, UserStatistics, Subscription } from "@/types";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
);

const TABS = [
  { key: "profile", label: "Profile", icon: User },
  { key: "wallet", label: "Wallet", icon: Wallet },
  { key: "statistics", label: "Stats", icon: BarChart2 },
  { key: "subscription", label: "Subscription", icon: Star },
  { key: "payments", label: "Payment Methods", icon: CreditCard },
  { key: "notifications", label: "Notifications", icon: Bell },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ─── Profile Tab ─────────────────────────────────────────────────────────────
function ProfileTab() {
  const { user, isLoading, refreshUser, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  const [form, setForm] = useState({
    fullName: user?.fullName ?? "",
    addressLine1: user?.addressLine1 ?? "",
    addressLine2: user?.addressLine2 ?? "",
    city: user?.city ?? "",
    state: user?.state ?? "",
    country: user?.country ?? "",
    zipcode: user?.zipcode ?? "",
  });

  useEffect(() => {
    if (!isEditing && user) {
      setForm({
        fullName: user.fullName ?? "",
        addressLine1: user.addressLine1 ?? "",
        addressLine2: user.addressLine2 ?? "",
        city: user.city ?? "",
        state: user.state ?? "",
        country: user.country ?? "",
        zipcode: user.zipcode ?? "",
      });
    }
  }, [user, isEditing]);

  // Redirect if the session clears unexpectedly (e.g. 401 invalidates user
  // without an explicit logout). `isLoggingOut` handles the explicit case.
  useEffect(() => {
    if (!isLoading && !isLoggingOut && !user) {
      router.replace("/login");
    }
  }, [isLoading, isLoggingOut, user, router]);

  async function handleSave() {
    setIsSaving(true);
    try {
      const payload: Record<string, string> = {};
      for (const [k, v] of Object.entries(form)) {
        if (v.trim()) payload[k] = v.trim();
      }
      await api.updateProfile(payload);
      await refreshUser();
      setIsEditing(false);
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update profile",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
      router.push("/login");
    } finally {
      setIsLoggingOut(false);
    }
  }

  if (isLoading || isLoggingOut || !user)
    return <Loading message="Loading profile..." />;

  const readOnly = [
    { label: "Email", value: user.email },
    { label: "Username", value: user.username ?? "N/A" },
    { label: "Role", value: user.role.toUpperCase() },
    { label: "Subscription", value: user.subscriptionTier },
    { label: "Verified", value: user.isVerified ? "Yes" : "No" },
  ];

  const editFields = [
    { key: "fullName", label: "Full Name", col: "full" },
    { key: "addressLine1", label: "Address Line 1", col: "full" },
    { key: "addressLine2", label: "Address Line 2", col: "full" },
    { key: "city", label: "City", col: "half" },
    { key: "state", label: "State", col: "half" },
    { key: "country", label: "Country", col: "half" },
    { key: "zipcode", label: "Zipcode", col: "half" },
  ];

  return (
    <div className="px-4 py-4 overflow-y-auto space-y-4">
      <div className="panel-dark p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-[#c9a84c] uppercase tracking-wider">
            Profile Information
          </h2>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 -m-2 text-[#c9a84c] hover:text-[#d4b04a]"
            >
              <Edit2 className="w-5 h-5" />
            </button>
          ) : (
            <div className="flex gap-1">
              <button
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
                className="p-2 -m-1 text-[#8a8a8a] hover:text-[#c0c0c0]"
              >
                <X className="w-5 h-5" />
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="p-2 -m-1 text-[#2a9d8f] hover:text-[#3bb5a5]"
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
              </button>
            </div>
          )}
        </div>

        {readOnly.map(({ label, value }) => (
          <div
            key={label}
            className="flex py-2 border-b border-[#2a2620] last:border-0"
          >
            <span className="w-28 text-[10px] font-bold text-[#8a8a8a] uppercase tracking-wider shrink-0">
              {label}
            </span>
            <span className="text-sm text-[#e0d8c8] flex-1">{value}</span>
          </div>
        ))}

        <div className="mt-3 flex flex-wrap gap-3">
          {editFields.map(({ key, label, col }) => (
            <div
              key={key}
              className={col === "full" ? "w-full" : "flex-1 min-w-[120px]"}
            >
              <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-wider mb-1">
                {label}
              </label>
              <input
                type="text"
                value={form[key as keyof typeof form]}
                onChange={(e) =>
                  setForm((p) => ({ ...p, [key]: e.target.value }))
                }
                disabled={!isEditing}
                className="auth-input px-3 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          ))}
        </div>
      </div>

      <Button
        variant="danger"
        size="full"
        onClick={handleLogout}
        disabled={isLoggingOut}
      >
        {isLoggingOut ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <LogOut className="w-4 h-4" /> Sign Out
          </>
        )}
      </Button>
    </div>
  );
}

// ─── Wallet Tab ───────────────────────────────────────────────────────────────
function WalletTab() {
  const router = useRouter();
  const {
    data: balance,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["walletBalance"],
    queryFn: api.getWalletBalance,
  });

  if (isLoading) return <Loading message="Loading wallet balance..." />;
  if (error) return <ErrorDisplay message={String(error)} onRetry={refetch} />;

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="panel-dark p-6 text-center">
        <p className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-wider mb-2">
          Your Balance
        </p>
        <p className="text-5xl font-black text-[#c9a84c]">
          {formatNumber(balance ?? 0)}
        </p>
        <p className="text-sm text-[#8a8a8a] mt-1 uppercase tracking-wider">
          Coins
        </p>
      </div>
      <Button size="full" onClick={() => router.push("/settings/wallet")}>
        <ArrowUpRight className="w-4 h-4" />
        View Transaction History
      </Button>
    </div>
  );
}

// ─── Statistics Tab ───────────────────────────────────────────────────────────
function StatisticsTab() {
  const router = useRouter();
  const {
    data: stats,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["myStatistics"],
    queryFn: api.getMyStatistics,
  });

  const { data: myReservations = [] } = useQuery({
    queryKey: ["myReservations"],
    queryFn: api.getMyReservations,
  });

  const finishedGameReservations = myReservations.filter(
    (r) => r.game?.status === "FINISHED",
  );
  const finishedGameIds = [
    ...new Set(finishedGameReservations.map((r) => r.gameId)),
  ];

  if (isLoading) return <Loading message="Loading statistics..." />;
  if (error) return <ErrorDisplay message={String(error)} onRetry={refetch} />;
  if (!stats) return null;

  const wr = winRate(stats);
  const wrColor =
    wr >= 60 ? "text-green-600" : wr >= 40 ? "text-orange-500" : "text-red-500";
  const nc = netCoins(stats);

  const statCards = [
    {
      icon: Trophy,
      color: "text-[#c9a84c] bg-[#c9a84c]/15",
      label: "Wins",
      value: stats.totalWins,
    },
    {
      icon: ThumbsDown,
      color: "text-red-400 bg-red-500/15",
      label: "Losses",
      value: stats.totalLosses,
    },
    {
      icon: Gamepad2,
      color: "text-[#2a9d8f] bg-[#2a9d8f]/15",
      label: "Games Played",
      value: totalGamesPlayed(stats),
    },
    {
      icon: Coins,
      color: "text-green-400 bg-green-500/15",
      label: "Coins Earned",
      value: stats.totalCoinsEarned,
    },
    {
      icon: Coins,
      color: "text-orange-400 bg-orange-500/15",
      label: "Coins Spent",
      value: stats.totalCoinsSpent,
    },
  ];

  const wrColorDark =
    wr >= 60 ? "text-green-400" : wr >= 40 ? "text-orange-400" : "text-red-400";

  return (
    <div className="px-4 py-4 space-y-3 overflow-y-auto">
      {/* Header stats */}
      <div className="panel-dark p-5 text-center">
        <p className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider mb-3">
          Your Stats
        </p>
        <div className="flex justify-center gap-8">
          <div>
            <p className="text-3xl font-black text-[#f0f0f0]">
              {totalGamesPlayed(stats)}
            </p>
            <p className="text-xs text-[#8a8a8a] mt-0.5 uppercase tracking-wider">
              Total Games
            </p>
          </div>
          <div className="w-px bg-[#2a2620]" />
          <div>
            <p className={cn("text-3xl font-black", wrColorDark)}>
              {wr.toFixed(1)}%
            </p>
            <p className="text-xs text-[#8a8a8a] mt-0.5 uppercase tracking-wider">
              Win Rate
            </p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-2">
        {statCards.map(({ icon: Icon, color, label, value }) => (
          <div key={label} className="panel-dark p-3 flex items-center gap-2">
            <div className={cn("p-2 rounded-lg shrink-0", color)}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-[#8a8a8a] uppercase tracking-wider truncate">
                {label}
              </p>
              <p className="text-base font-bold text-[#f0f0f0]">
                {formatNumber(Number(value))}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Net coins */}
      <div
        className={cn(
          "panel-dark p-3 flex items-center gap-2",
          nc >= 0
            ? "border-green-500/40 shadow-[0_0_12px_rgba(34,197,94,0.08)]"
            : "border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.08)]",
        )}
      >
        {nc >= 0 ? (
          <TrendingUp className="w-5 h-5 text-green-400" />
        ) : (
          <TrendingDown className="w-5 h-5 text-red-400" />
        )}
        <div>
          <p className="text-[10px] text-[#8a8a8a] uppercase tracking-wider">
            Net Balance
          </p>
          <p
            className={cn(
              "text-base font-bold",
              nc >= 0 ? "text-green-400" : "text-red-400",
            )}
          >
            {nc >= 0 ? "+" : ""}
            {formatNumber(nc)}
          </p>
        </div>
      </div>

      {/* Games History */}
      {finishedGameIds.length > 0 && (
        <div className="panel-dark">
          <div className="px-4 py-3 border-b border-[#2a2620]">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#c9a84c]" />
              <span className="text-xs font-bold text-[#c9a84c] uppercase tracking-wider">
                Games History
              </span>
              <span className="text-xs text-[#8a8a8a]">
                ({finishedGameIds.length})
              </span>
            </div>
          </div>
          <div>
            {finishedGameIds.map((gameId) => {
              const r = finishedGameReservations.find(
                (res) => res.gameId === gameId,
              )!;
              return (
                <button
                  key={gameId}
                  onClick={() => router.push(`/games/${gameId}`)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#1a1816] text-left border-b border-[#2a2620] last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-[#e0d8c8]">
                      Game #{gameId}
                    </p>
                    <p className="text-xs text-[#8a8a8a]">
                      {formatDate(r.createdAt)}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#6a6a6a]" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Subscription Tab ─────────────────────────────────────────────────────────
function SubscriptionTab() {
  const router = useRouter();
  const {
    data: sub,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["currentSubscription"],
    queryFn: api.getCurrentSubscription,
  });

  if (isLoading) return <Loading message="Loading subscription..." />;
  if (error) return <ErrorDisplay message={String(error)} onRetry={refetch} />;
  if (!sub) return <EmptyState message="No active subscription" icon={Star} />;

  const statusColors: Record<string, string> = {
    ACTIVE: "bg-green-500/20 text-green-400 border border-green-500/40",
    CANCELLED: "bg-orange-500/20 text-orange-400 border border-orange-500/40",
    EXPIRED: "bg-red-500/20 text-red-400 border border-red-500/40",
    PENDING: "bg-blue-500/20 text-blue-400 border border-blue-500/40",
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="panel-dark p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-2xl font-black text-[#c9a84c]">{sub.tier}</p>
          <span
            className={cn(
              "text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider",
              statusColors[sub.status] ??
                "bg-[#2a2620] text-[#8a8a8a] border border-[#3a3530]",
            )}
          >
            {sub.status}
          </span>
        </div>
        {sub.billingPeriod && (
          <p className="text-sm text-[#c0b8a8] mb-2">
            Billing Period:{" "}
            <strong className="text-[#e0d8c8]">{sub.billingPeriod}</strong>
          </p>
        )}
        {sub.currentPeriodStart && (
          <p className="text-xs text-[#8a8a8a]">
            Period Start: {formatDate(sub.currentPeriodStart)}
          </p>
        )}
        {sub.currentPeriodEnd && (
          <p className="text-xs text-[#8a8a8a]">
            Period End: {formatDate(sub.currentPeriodEnd)}
          </p>
        )}
        {sub.cancelAtPeriodEnd && (
          <div className="mt-3 bg-orange-500/10 border border-orange-500/40 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
            <p className="text-xs text-orange-300">
              Subscription will cancel at period end
            </p>
          </div>
        )}
      </div>
      <Button size="full" onClick={() => router.push("/settings/subscription")}>
        <ArrowUpRight className="w-4 h-4" />
        View Payment History
      </Button>
    </div>
  );
}

// ─── Payment Methods Tab ──────────────────────────────────────────────────────
function AddCardForm({
  onSuccess,
  onClose,
}: {
  onSuccess: () => void;
  onClose: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  async function handleSave() {
    if (!stripe || !elements) return;
    setIsProcessing(true);
    try {
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: "if_required",
      });
      if (error) throw new Error(error.message);
      if (setupIntent?.payment_method) {
        try {
          await api.attachPaymentMethod(String(setupIntent.payment_method));
        } catch {
          /* webhook might have attached it */
        }
      }
      queryClient.invalidateQueries({ queryKey: ["paymentMethods"] });
      toast.success("Payment method added successfully");
      onSuccess();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to add payment method",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="panel-dark relative w-full max-w-lg mx-auto rounded-b-none rounded-t-2xl p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-[#c9a84c] uppercase tracking-wider">
            Add Payment Method
          </h2>
          <button
            onClick={onClose}
            className="text-[#6a6a6a] hover:text-[#c0c0c0]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <PaymentElement />
        <div className="mt-5">
          <Button
            size="full"
            onClick={handleSave}
            disabled={isProcessing || !stripe}
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Save Card"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PaymentMethodsTab() {
  const queryClient = useQueryClient();
  const [showAddCard, setShowAddCard] = useState(false);
  const [setupClientSecret, setSetupClientSecret] = useState<string | null>(
    null,
  );

  const {
    data: methods = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["paymentMethods"],
    queryFn: api.getPaymentMethods,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deletePaymentMethod(id),
    onSuccess: () => {
      toast.success("Payment method deleted");
      queryClient.invalidateQueries({ queryKey: ["paymentMethods"] });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Delete failed"),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => api.setDefaultPaymentMethod(id),
    onSuccess: () => {
      toast.success("Default payment method updated");
      queryClient.invalidateQueries({ queryKey: ["paymentMethods"] });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to set default"),
  });

  async function handleAddCard() {
    try {
      const secret = await api.createSetupIntent();
      setSetupClientSecret(secret);
      setShowAddCard(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start setup");
    }
  }

  if (isLoading) return <Loading message="Loading payment methods..." />;
  if (error) return <ErrorDisplay message={String(error)} onRetry={refetch} />;

  return (
    <div className="px-4 py-4 space-y-3 overflow-y-auto">
      {methods.length === 0 && (
        <EmptyState message="No payment methods saved" icon={CreditCard} />
      )}
      {methods.map((m) => (
        <div key={m.id} className="panel-dark p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#2a2620] border border-[#3a3530] flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5 text-[#c9a84c]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-[#e0d8c8] tracking-widest">
                **** **** **** {m.last4}
              </p>
              {m.isDefault && (
                <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/40 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                  Default
                </span>
              )}
            </div>
            <p className="text-xs text-[#8a8a8a]">
              {m.brand.toUpperCase()} · Exp{" "}
              {String(m.expMonth).padStart(2, "0")}/
              {String(m.expYear).slice(-2)}
            </p>
          </div>
          <div className="flex gap-1">
            {!m.isDefault && (
              <button
                onClick={() => setDefaultMutation.mutate(m.id)}
                className="p-1.5 text-[#c9a84c] hover:text-[#d4b04a]"
                title="Set as default"
              >
                <Star className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => deleteMutation.mutate(m.id)}
              className="p-1.5 text-red-400 hover:text-red-600"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
      <Button size="full" onClick={handleAddCard}>
        <Plus className="w-4 h-4" />
        Add Payment Method
      </Button>

      {showAddCard && setupClientSecret && (
        <Elements
          stripe={stripePromise}
          options={{ clientSecret: setupClientSecret }}
        >
          <AddCardForm
            onSuccess={() => setShowAddCard(false)}
            onClose={() => setShowAddCard(false)}
          />
        </Elements>
      )}
    </div>
  );
}

// ─── Notifications Tab ─────────────────────────────────────────────────────────
function NotificationsTab() {
  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <p className="text-sm text-[#8a8a8a] text-center">
        Notification preferences coming soon
      </p>
    </div>
  );
}

// ─── Main Settings Page ────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("profile");

  const tabContent: Record<TabKey, React.ReactNode> = {
    profile: <ProfileTab />,
    wallet: <WalletTab />,
    statistics: <StatisticsTab />,
    subscription: <SubscriptionTab />,
    payments: <PaymentMethodsTab />,
    notifications: <NotificationsTab />,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <PageHeader label="Settings" icon={GiGearHammer} />

      {/* Tab bar (horizontal scroll) */}
      <div className="border-b border-[#2a2620] overflow-x-auto scrollbar-hide shrink-0">
        <div className="flex min-w-max">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-4 py-2 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap",
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
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">{tabContent[activeTab]}</div>
    </div>
  );
}
