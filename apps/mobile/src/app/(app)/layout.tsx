"use client";

// Authenticated layout: wraps all (app)/* routes
// Initializes WebSocket on mount, provides QueryClient, Auth, Stripe
// Renders BottomNavBar + WebSocketStatusBar above it

import { useCallback, useEffect, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { AuthProvider } from "@/lib/auth-context";
import { wsManager, type WebSocketStatus } from "@/lib/websocket";
import { useAuth } from "@/lib/auth-context";
import { registerPushNotifications, onForegroundMessage } from "@/lib/firebase";
import { BottomNavBar } from "@/components/bottom-nav-bar";
import { WebSocketStatusBar } from "@/components/websocket-status-bar";

const NOTIFICATION_DISMISSED_KEY = "btv:notification_prompt_dismissed";
const NOTIFICATION_RESPONDED_KEY = "btv:notification_prompt_responded";
const DISMISS_COOLDOWN_DAYS = 2;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
);

function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [wsStatus, setWsStatus] = useState<WebSocketStatus>("disconnected");

  const fcmRegistered = useRef(false);
  const [showNotificationBanner, setShowNotificationBanner] = useState(false);

  // Initialize WebSocket when authenticated (from websocket_provider.dart initializeWebSocket)
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsub = wsManager.onStatusChange(setWsStatus);
    wsManager.connect();

    return () => {
      unsub();
    };
  }, [isAuthenticated]);

  const fgUnsubscribe = useRef<(() => void) | null>(null);

  const setupForegroundMessages = useCallback(() => {
    onForegroundMessage((payload) => {
      if (payload.title) {
        const url = payload.data?.url;
        const safeUrl = url?.startsWith("https://") ? url : undefined;
        toast(payload.title, {
          description: payload.body,
          duration: 10000,
          icon: <Bell className="size-5 text-blue-500" />,
          action: safeUrl
            ? {
                label: "Watch Live",
                onClick: () => window.open(safeUrl, "_blank"),
              }
            : undefined,
          classNames: {
            toast: "!bg-white !border-blue-200 !shadow-lg",
            title: "!text-gray-900 !font-semibold",
            description: "!text-gray-600",
            actionButton:
              "!bg-blue-600 !text-white !rounded-md !px-4 !py-1.5 !font-medium",
          },
        });
      }
    }).then((unsub) => {
      fgUnsubscribe.current = unsub;
    });
    return () => {
      fgUnsubscribe.current?.();
      fgUnsubscribe.current = null;
    };
  }, []);

  // Register FCM push notifications when authenticated
  useEffect(() => {
    if (!isAuthenticated || fcmRegistered.current) return;
    if (typeof Notification === "undefined") return;

    fcmRegistered.current = true;

    if (Notification.permission === "granted") {
      registerPushNotifications();
      return setupForegroundMessages();
    }

    if (Notification.permission === "denied") return;

    // Permission is "default" — check if user already responded to our prompt
    const responded = localStorage.getItem(NOTIFICATION_RESPONDED_KEY);
    if (responded) return;

    // Check dismiss cooldown
    const dismissedAt = localStorage.getItem(NOTIFICATION_DISMISSED_KEY);
    if (dismissedAt) {
      const daysSince =
        (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSince < DISMISS_COOLDOWN_DAYS) return;
    }

    setShowNotificationBanner(true);
  }, [isAuthenticated, setupForegroundMessages]);

  const handleEnableNotifications = async () => {
    setShowNotificationBanner(false);
    localStorage.setItem(NOTIFICATION_RESPONDED_KEY, "true");
    const token = await registerPushNotifications();
    if (token) {
      setupForegroundMessages();
    }
  };

  const handleDismissNotifications = () => {
    setShowNotificationBanner(false);
    localStorage.setItem(NOTIFICATION_DISMISSED_KEY, Date.now().toString());
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {showNotificationBanner && (
        <div className="bg-blue-600 text-white px-4 py-3 flex items-center gap-3">
          <Bell className="size-5 shrink-0" />
          <p className="text-sm flex-1">Get notified when streams go live!</p>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleEnableNotifications}
              className="bg-white text-blue-600 text-sm font-medium px-3 py-1.5 rounded-md"
            >
              Enable
            </button>
            <button
              onClick={handleDismissNotifications}
              className="text-white/80 text-sm px-2"
            >
              Later
            </button>
          </div>
        </div>
      )}
      <main
        className="flex-1 max-w-lg mx-auto w-full overflow-y-auto"
        style={{ paddingBottom: "calc(56px + env(safe-area-inset-bottom))" }}
      >
        {children}
      </main>
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <WebSocketStatusBar status={wsStatus} />
        <BottomNavBar />
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Elements stripe={stripePromise}>
          <AppShell>{children}</AppShell>
        </Elements>
      </AuthProvider>
    </QueryClientProvider>
  );
}
