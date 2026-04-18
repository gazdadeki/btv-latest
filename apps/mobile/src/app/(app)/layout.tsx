"use client";

// Authenticated layout: wraps all (app)/* routes
// Initializes WebSocket on mount, provides QueryClient, Auth, Stripe
// Renders BottomNavBar + WebSocketStatusBar above it

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const { isAuthenticated, isVerified } = useAuth();
  const [wsStatus, setWsStatus] = useState<WebSocketStatus>("disconnected");

  // Track the fixed bottom bar's actual height so <main>'s paddingBottom
  // stays in sync when the nav frame resizes or the WebSocket status bar
  // appears/disappears — otherwise the last item can clip behind it.
  const bottomBarRef = useRef<HTMLDivElement>(null);
  const [bottomBarHeight, setBottomBarHeight] = useState(76);
  useEffect(() => {
    const el = bottomBarRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setBottomBarHeight(entry.contentRect.height);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Redirect unverified users to verification page
  useEffect(() => {
    if (isAuthenticated && !isVerified) {
      router.replace("/verification");
    }
  }, [isAuthenticated, isVerified, router]);

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
    let mounted = true;
    onForegroundMessage((payload) => {
      if (payload.title) {
        const url = payload.data?.url;
        const safeUrl = url?.startsWith("https://") ? url : undefined;
        toast(payload.title, {
          description: payload.body,
          duration: 10000,
          icon: <Bell className="size-5 text-[#c9a84c]" />,
          action: safeUrl
            ? {
                label: "Watch Live",
                onClick: () =>
                  window.open(safeUrl, "_blank", "noopener,noreferrer"),
              }
            : undefined,
          classNames: {
            toast:
              "!bg-[#1c1a18] !border !border-[#2a2620] !shadow-lg !shadow-black/40",
            title: "!text-[#f0f0f0] !font-semibold",
            description: "!text-[#a89f8e]",
            actionButton:
              "!bg-[#2a9d8f] !text-white !rounded-md !px-4 !py-1.5 !font-medium hover:!bg-[#26897d]",
          },
        });
      }
    }).then((unsub) => {
      if (mounted) {
        fgUnsubscribe.current = unsub;
      } else {
        unsub?.();
      }
    });
    return () => {
      mounted = false;
      fgUnsubscribe.current?.();
      fgUnsubscribe.current = null;
    };
  }, []);

  // Reset FCM registration state on logout
  useEffect(() => {
    if (!isAuthenticated) {
      fcmRegistered.current = false;
      fgUnsubscribe.current?.();
      fgUnsubscribe.current = null;
    }
  }, [isAuthenticated]);

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
    <div className="min-h-screen flex flex-col bg-[#0f0e0c]">
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
        style={{
          paddingBottom: `calc(${bottomBarHeight}px + env(safe-area-inset-bottom))`,
        }}
      >
        {children}
      </main>
      <div ref={bottomBarRef} className="fixed bottom-0 left-0 right-0 z-40">
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
