'use client';

// Translated from Mobile/lib/shared/widgets/bottom_nav_bar.dart
// 5 tabs: Home, Messages, Settings, Shop, Tutorials — in that exact order
// Shows unread count badge on Messages tab

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageSquare, Settings, ShoppingBag, BookOpen } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

const NAV_ITEMS = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/shop', label: 'Shop', icon: ShoppingBag },
  { href: '/tutorials', label: 'Tutorials', icon: BookOpen },
] as const;

export function BottomNavBar() {
  const pathname = usePathname();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unreadCount'],
    queryFn: api.getUnreadCount,
    refetchInterval: 30_000,
  });

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch max-w-lg mx-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          const isMessages = href === '/messages';
          const showBadge = isMessages && unreadCount > 0;

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-[56px] relative transition-colors',
                isActive ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600',
              )}
            >
              <div className="relative">
                <Icon className="w-6 h-6" />
                {showBadge && (
                  <span className="absolute -top-1 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 leading-none">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
