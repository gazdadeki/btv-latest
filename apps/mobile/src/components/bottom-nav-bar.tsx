"use client";

// 5 tabs: Arena, Messages, Settings, Store, Guide — in that exact order
// Shows unread count badge on Messages tab
// Gaming-style dark nav with gold circular icons

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  RiMessage3Fill,
  RiSettings3Fill,
  RiShoppingCart2Fill,
  RiBookOpenFill,
} from "react-icons/ri";
import { GiCrossedSwords } from "react-icons/gi";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/home", label: "Arena", icon: GiCrossedSwords },
  { href: "/messages", label: "Messages", icon: RiMessage3Fill },
  { href: "/settings", label: "Settings", icon: RiSettings3Fill },
  { href: "/shop", label: "Store", icon: RiShoppingCart2Fill },
  { href: "/tutorials", label: "Guide", icon: RiBookOpenFill },
] as const;

export function BottomNavBar() {
  const pathname = usePathname();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unreadCount"],
    queryFn: api.getUnreadCount,
    refetchInterval: 30_000,
  });

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div
        className="relative flex items-stretch justify-around max-w-lg mx-auto px-6 py-4"
        style={{
          backgroundImage: "url('/frames/footer-border-bcg.png')",
          backgroundSize: "100% 100%",
          backgroundRepeat: "no-repeat",
        }}
      >
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          const isMessages = href === "/messages";
          const showBadge = isMessages && unreadCount > 0;

          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-1 min-w-[56px]"
            >
              <div className="relative">
                <div
                  className={cn(
                    "nav-icon-circle",
                    isActive
                      ? "nav-icon-circle--active"
                      : "nav-icon-circle--inactive",
                  )}
                >
                  <Icon
                    className={cn(
                      "w-5 h-5",
                      isActive ? "text-[#1a1a0a]" : "text-[#c9a84c]",
                    )}
                  />
                </div>
                {showBadge && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none shadow-lg shadow-red-500/30">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-semibold tracking-wide",
                  isActive ? "text-[#c9a84c]" : "text-[#8a7a50]",
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
