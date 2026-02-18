'use client';

// Translated from Mobile/lib/features/messages/pages/conversations_list_page.dart
// Shows conversation list with unread badge. FAB to create new conversation with admin search.

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Plus, MessageSquare, Search, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { wsManager } from '@/lib/websocket';
import { useAuth } from '@/lib/auth-context';
import { Loading } from '@/components/loading';
import { EmptyState } from '@/components/empty-state';
import { ErrorDisplay } from '@/components/error-display';
import { Button } from '@/components/button';
import { cn, formatTimeAgo } from '@/lib/utils';
import type { Conversation, AdminUser } from '@/types';
import { adminDisplayName } from '@/types';

// ─── Admin search dialog ────────────────────────────────────────────────────────
function NewConversationDialog({ onCreated, onClose }: { onCreated: (id: number) => void; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const { data: admins = [], isLoading } = useQuery({
    queryKey: ['admins', query],
    queryFn: () => api.getAdmins(query || undefined),
    staleTime: 5000,
  });

  const filtered = query
    ? admins.filter(a =>
        a.email.toLowerCase().includes(query.toLowerCase()) ||
        (a.username ?? '').toLowerCase().includes(query.toLowerCase()),
      )
    : admins;

  async function handleCreate() {
    if (!selectedAdmin) return;
    setIsCreating(true);
    try {
      const conv = await api.createConversation(selectedAdmin.id);
      onCreated(conv.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create conversation');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white rounded-xl w-full max-w-sm max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">New Conversation</h2>
          <button onClick={onClose} className="text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search admins by username or email"
              value={query}
              onChange={e => { setQuery(e.target.value); setSelectedAdmin(null); }}
              className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading && <Loading message="Searching..." />}
          {!isLoading && filtered.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No admins found</p>
          )}
          {filtered.map(admin => (
            <button
              key={admin.id}
              onClick={() => setSelectedAdmin(a => a?.id === admin.id ? null : admin)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-50',
                selectedAdmin?.id === admin.id && 'bg-indigo-50',
              )}
            >
              <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-indigo-600">
                  {adminDisplayName(admin).charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">{adminDisplayName(admin)}</p>
                {admin.username && <p className="text-xs text-gray-500">{admin.email}</p>}
              </div>
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-gray-100 flex gap-2">
          <Button variant="secondary" size="md" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button size="md" className="flex-1" disabled={!selectedAdmin || isCreating} onClick={handleCreate}>
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Conversation item ──────────────────────────────────────────────────────────
function ConversationItem({ conv, currentUserId, onTap }: { conv: Conversation; currentUserId: number; onTap: () => void }) {
  const otherParticipants = conv.participants.filter(p => p.id !== currentUserId);
  const displayName = otherParticipants.length > 0
    ? otherParticipants.map(p => p.email).join(', ')
    : 'Conversation';
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <button
      onClick={onTap}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-100 text-left active:bg-gray-100"
    >
      <div className="relative shrink-0">
        <div className="w-11 h-11 rounded-full bg-indigo-100 flex items-center justify-center">
          <span className="text-base font-bold text-indigo-600">{initials}</span>
        </div>
        {conv.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
            {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className={cn('text-sm font-medium text-gray-900 truncate', conv.unreadCount > 0 && 'font-bold')}>{displayName}</p>
          <p className="text-xs text-gray-400 shrink-0 ml-2">
            {conv.lastMessageAt ? formatTimeAgo(conv.lastMessageAt) : ''}
          </p>
        </div>
        {conv.lastMessage && (
          <p className={cn('text-xs text-gray-500 truncate mt-0.5', conv.unreadCount > 0 && 'text-gray-800 font-medium')}>
            {conv.lastMessage.content}
          </p>
        )}
      </div>
    </button>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function MessagesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showNewDialog, setShowNewDialog] = useState(false);

  const { data: conversations = [], isLoading, error, refetch } = useQuery({
    queryKey: ['conversations'],
    queryFn: api.getConversations,
    refetchInterval: 30_000,
  });

  // Listen for new messages via WebSocket and refresh
  useEffect(() => {
    const off = wsManager.on('message:new', () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
    });
    return off;
  }, [queryClient]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Messages</h1>
        <button onClick={() => refetch()} className="text-sm text-indigo-600 hover:text-indigo-800">Refresh</button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && <Loading message="Loading conversations..." />}
        {error && <ErrorDisplay message={String(error)} onRetry={refetch} />}
        {!isLoading && !error && conversations.length === 0 && (
          <EmptyState
            message={'No conversations yet.\nStart a conversation with an admin.'}
            icon={MessageSquare}
          />
        )}
        {conversations.map(conv => (
          <ConversationItem
            key={conv.id}
            conv={conv}
            currentUserId={user?.id ?? 0}
            onTap={() => router.push(`/messages/${conv.id}`)}
          />
        ))}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowNewDialog(true)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-700 active:scale-95 transition-all z-30"
      >
        <Plus className="w-6 h-6" />
      </button>

      {showNewDialog && (
        <NewConversationDialog
          onCreated={id => { setShowNewDialog(false); router.push(`/messages/${id}`); }}
          onClose={() => setShowNewDialog(false)}
        />
      )}
    </div>
  );
}
