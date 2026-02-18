'use client';

// Authenticated layout: wraps all (app)/* routes
// Initializes WebSocket on mount, provides QueryClient, Auth, Stripe
// Renders BottomNavBar + WebSocketStatusBar above it

import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { AuthProvider } from '@/lib/auth-context';
import { wsManager, type WebSocketStatus } from '@/lib/websocket';
import { useAuth } from '@/lib/auth-context';
import { BottomNavBar } from '@/components/bottom-nav-bar';
import { WebSocketStatusBar } from '@/components/websocket-status-bar';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '',
);

function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [wsStatus, setWsStatus] = useState<WebSocketStatus>('disconnected');

  // Initialize WebSocket when authenticated (from websocket_provider.dart initializeWebSocket)
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsub = wsManager.onStatusChange(setWsStatus);
    wsManager.connect();

    return () => {
      unsub();
    };
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main
        className="flex-1 max-w-lg mx-auto w-full overflow-y-auto"
        style={{ paddingBottom: 'calc(56px + env(safe-area-inset-bottom))' }}
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
