"use client";

// Translated from Mobile/lib/features/messages/pages/conversations_list_page.dart
// Shows conversation list with unread badge. FAB to create new conversation with admin search.

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Plus, MessageSquare, Search, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { wsManager } from "@/lib/websocket";
import { useAuth } from "@/lib/auth-context";
import { Loading } from "@/components/loading";
import { EmptyState } from "@/components/empty-state";
import { ErrorDisplay } from "@/components/error-display";
import { Button } from "@/components/button";
import { PageHeader } from "@/components/page-header";
import { GiMailbox } from "react-icons/gi";
import { cn, formatTimeAgo } from "@/lib/utils";
import type { Conversation, AdminUser } from "@/types";
import { adminDisplayName } from "@/types";

// ─── Admin search dialog ────────────────────────────────────────────────────────
function NewConversationDialog({
  onCreated,
  onClose,
}: {
  onCreated: (id: number) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const { data: admins = [], isLoading } = useQuery({
    queryKey: ["admins", query],
    queryFn: () => api.getAdmins(query || undefined),
    staleTime: 5000,
  });

  const filtered = query
    ? admins.filter(
        (a) =>
          a.email.toLowerCase().includes(query.toLowerCase()) ||
          (a.username ?? "").toLowerCase().includes(query.toLowerCase()),
      )
    : admins;

  async function handleCreate() {
    if (!selectedAdmin) return;
    setIsCreating(true);
    try {
      const conv = await api.createConversation(selectedAdmin.id);
      onCreated(conv.id);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create conversation",
      );
    } finally {
      setIsCreating(false);
    }
  }

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
            New Conversation
          </h2>
          <button
            onClick={onClose}
            className="text-[#6a6a6a] hover:text-[#c0c0c0]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-3 border-b border-[#2a2620]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6a6a6a]" />
            <input
              type="text"
              placeholder="Search admins by username or email"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedAdmin(null);
              }}
              className="auth-input pl-9 pr-3 py-2 text-sm"
              autoFocus
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading && <Loading message="Searching..." />}
          {!isLoading && filtered.length === 0 && (
            <p className="text-sm text-[#8a8a8a] text-center py-4">
              No admins found
            </p>
          )}
          {filtered.map((admin) => (
            <button
              key={admin.id}
              onClick={() =>
                setSelectedAdmin((a) => (a?.id === admin.id ? null : admin))
              }
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#1a1816] border-b border-[#2a2620] last:border-0",
                selectedAdmin?.id === admin.id && "bg-[#2a9d8f]/10",
              )}
            >
              <div className="w-9 h-9 rounded-full bg-[#2a9d8f]/20 border border-[#2a9d8f]/40 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-[#2a9d8f]">
                  {adminDisplayName(admin).charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-[#f0f0f0]">
                  {adminDisplayName(admin)}
                </p>
                {admin.username && (
                  <p className="text-xs text-[#8a8a8a]">{admin.email}</p>
                )}
              </div>
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-[#2a2620] flex gap-2">
          <button
            onClick={onClose}
            className="btn-dark-secondary flex-1 px-4 py-2.5 text-sm min-h-[44px]"
          >
            Cancel
          </button>
          <Button
            size="md"
            className="flex-1"
            disabled={!selectedAdmin || isCreating}
            onClick={handleCreate}
          >
            {isCreating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Create"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Conversation item ──────────────────────────────────────────────────────────
function ConversationItem({
  conv,
  currentUserId,
  onTap,
}: {
  conv: Conversation;
  currentUserId: number;
  onTap: () => void;
}) {
  const otherParticipants = conv.participants.filter(
    (p) => p.id !== currentUserId,
  );
  const displayName =
    otherParticipants.length > 0
      ? otherParticipants.map((p) => p.email).join(", ")
      : "Conversation";
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <button
      onClick={onTap}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1a1816] border-b border-[#2a2620] text-left active:bg-[#141210]"
    >
      <div className="relative shrink-0">
        <div className="w-11 h-11 rounded-full bg-[#2a9d8f]/15 border border-[#2a9d8f]/40 flex items-center justify-center">
          <span className="text-base font-bold text-[#2a9d8f]">{initials}</span>
        </div>
        {conv.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 shadow-lg shadow-red-500/30">
            {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p
            className={cn(
              "text-sm truncate",
              conv.unreadCount > 0
                ? "font-bold text-[#f0f0f0]"
                : "font-medium text-[#c0b8a8]",
            )}
          >
            {displayName}
          </p>
          <p className="text-xs text-[#6a6a6a] shrink-0 ml-2">
            {conv.lastMessageAt ? formatTimeAgo(conv.lastMessageAt) : ""}
          </p>
        </div>
        {conv.lastMessage && (
          <p
            className={cn(
              "text-xs truncate mt-0.5",
              conv.unreadCount > 0
                ? "text-[#e0d8c8] font-medium"
                : "text-[#8a8a8a]",
            )}
          >
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

  const {
    data: conversations = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["conversations"],
    queryFn: api.getConversations,
    refetchInterval: 30_000,
  });

  // Listen for new messages via WebSocket and refresh
  useEffect(() => {
    const off = wsManager.on("message:new", () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["unreadCount"] });
    });
    return off;
  }, [queryClient]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <PageHeader
        label="Messages"
        icon={GiMailbox}
        rightAction={
          <button
            onClick={() => refetch()}
            className="text-xs font-semibold text-[#c9a84c] hover:text-[#d4b04a] uppercase tracking-wide"
          >
            Refresh
          </button>
        }
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && <Loading message="Loading conversations..." />}
        {error && <ErrorDisplay message={String(error)} onRetry={refetch} />}
        {!isLoading && !error && conversations.length === 0 && (
          <EmptyState
            message={
              "No conversations yet.\nStart a conversation with an admin."
            }
            icon={MessageSquare}
          />
        )}
        {conversations.map((conv) => (
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
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-all z-30 text-[#1a1200]"
        style={{
          background:
            "linear-gradient(160deg, #c9a84c 0%, #b8962e 40%, #d4b04a 60%, #c09a38 100%)",
          border: "2px solid #a68628",
          boxShadow:
            "0 4px 12px rgba(0, 0, 0, 0.5), 0 0 12px rgba(201, 168, 76, 0.35), inset 0 1px 1px rgba(255, 230, 150, 0.35), inset 0 -1px 1px rgba(100, 80, 20, 0.3)",
        }}
      >
        <Plus className="w-6 h-6" />
      </button>

      {showNewDialog && (
        <NewConversationDialog
          onCreated={(id) => {
            setShowNewDialog(false);
            router.push(`/messages/${id}`);
          }}
          onClose={() => setShowNewDialog(false)}
        />
      )}
    </div>
  );
}
