"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { webSocketManager } from "@/lib/websocket";
import { api } from "@/lib/api";
import { AuthUtils } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { FEATURES } from "@/lib/features";
import { StreamControl } from "@/components/stream-control";
import { TruncatedText } from "@/components/ui/truncated-text";

const allNavItems = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: "fas fa-tachometer-alt",
    exact: true,
  },
  { href: "/admin/calendar", label: "Calendar", icon: "fas fa-calendar-alt" },
  { href: "/admin/users", label: "Users", icon: "fas fa-users" },
  { href: "/admin/schedules", label: "Schedules", icon: "fas fa-clock" },
  { href: "/admin/games", label: "Games", icon: "fas fa-gamepad" },
  {
    href: "/admin/subscriptions",
    label: "Subscriptions",
    icon: "fas fa-credit-card",
  },
  { href: "/admin/tutorials", label: "Tutorials", icon: "fas fa-book" },
  {
    href: "/admin/stripe-products",
    label: "Stripe Products",
    icon: "fas fa-shopping-cart",
  },
  { href: "/admin/messages", label: "Messages", icon: "fas fa-envelope" },
  { href: "/admin/audit", label: "Audit Log", icon: "fas fa-history" },
];

const navItems = allNavItems.filter(
  (item) => FEATURES.MESSAGES || item.href !== "/admin/messages",
);

function Sidebar() {
  const pathname = usePathname();
  const [wsStatus, setWsStatus] = useState<string>("disconnected");

  useEffect(() => {
    const unsub = webSocketManager.on("_status", (status) => {
      setWsStatus(status as string);
    });
    webSocketManager.connect();
    return () => {
      unsub();
    };
  }, []);

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-gray-900 text-white flex flex-col z-40">
      <div className="h-16 flex items-center justify-center border-b border-gray-700">
        <Link
          href="/admin"
          className="text-xl font-bold text-white no-underline"
        >
          BaltazarTV
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 text-sm no-underline transition-colors",
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white",
              )}
            >
              <i className={cn(item.icon, "w-5 text-center")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-3 border-t border-gray-700 flex items-center gap-2">
        <span
          className={cn(
            "inline-block w-2 h-2 rounded-full",
            wsStatus === "connected" ? "bg-green-500" : "bg-red-500",
          )}
        />
        <span className="text-xs text-gray-400 capitalize">{wsStatus}</span>
      </div>
    </aside>
  );
}

function Header() {
  const { user } = useAuth();

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore
    }
    AuthUtils.clearAuth();
    window.location.href = "/admin/login";
  };

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-30">
      <StreamControl />
      <div className="flex items-center gap-4 min-w-0">
        <TruncatedText
          text={user?.email}
          className="text-sm text-gray-600 max-w-[240px] block"
        />
        <button
          onClick={handleLogout}
          className="text-sm text-red-600 hover:text-red-800 cursor-pointer"
        >
          <i className="fas fa-sign-out-alt mr-1" />
          Logout
        </button>
      </div>
    </header>
  );
}

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Sidebar />
      <Header />
      <main className="ml-64 mt-16 p-6">{children}</main>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AuthProvider>
  );
}
