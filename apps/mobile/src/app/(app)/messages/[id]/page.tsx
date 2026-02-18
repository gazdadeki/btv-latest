'use client';

// Translated from Mobile/lib/features/messages/pages/conversation_page.dart
// Real-time: join/leave conversation room on mount/unmount
// Listens for message:new WebSocket events to append messages in real-time
// Marks conversation as read on mount. Messages ordered newest at bottom (reversed).

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { wsManager } from '@/lib/websocket';
import { useAuth } from '@/lib/auth-context';
import { Loading } from '@/components/loading';
import { ErrorDisplay } from '@/components/error-display';
import { cn, formatTimeAgo } from '@/lib/utils';
import type { Message } from '@/types';

function MessageBubble({ message, isMe }: { message: Message; isMe: boolean }) {
  return (
    <div className={cn('flex mb-3', isMe ? 'justify-end' : 'justify-start')}>
      <div className={cn(
        'max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed',
        isMe
          ? 'bg-indigo-600 text-white rounded-br-sm'
          : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm',
      )}>
        {!isMe && (
          <p className="text-[10px] font-bold text-indigo-600 mb-1">
            {message.sender?.email ?? 'Admin'}
          </p>
        )}
        <p>{message.content}</p>
        <p className={cn('text-[10px] mt-1', isMe ? 'text-indigo-200' : 'text-gray-400')}>
          {formatTimeAgo(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

export default function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const conversationId = parseInt(id, 10);
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: conversation } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => api.getConversation(conversationId),
  });

  const { data: msgData, isLoading, error, refetch } = useQuery({
    queryKey: ['conversationMessages', conversationId],
    queryFn: () => api.getConversationMessages(conversationId, 1, 100),
  });

  const messages = msgData?.messages ?? [];
  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  // Join conversation room
  useEffect(() => {
    wsManager.send('messages:join', { conversationId });
    return () => wsManager.send('messages:leave', { conversationId });
  }, [conversationId]);

  // Listen for new messages
  useEffect(() => {
    const off = wsManager.on('message:new', (data: unknown) => {
      const msg = data as { conversationId?: number };
      if (msg?.conversationId === conversationId) {
        queryClient.invalidateQueries({ queryKey: ['conversationMessages', conversationId] });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
      }
    });
    return off;
  }, [conversationId, queryClient]);

  // Mark as read on mount
  useEffect(() => {
    api.markConversationAsRead(conversationId).catch(() => undefined);
    return () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
    };
  }, [conversationId, queryClient]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sortedMessages.length]);

  async function handleSend() {
    const content = input.trim();
    if (!content || isSending) return;
    setInput('');
    setIsSending(true);
    try {
      await api.sendMessage(conversationId, content);
      queryClient.invalidateQueries({ queryKey: ['conversationMessages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const otherParticipants = conversation?.participants.filter(p => p.id !== user?.id) ?? [];
  const title = otherParticipants.length > 0
    ? otherParticipants.map(p => p.email).join(', ')
    : 'Conversation';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-2 py-3 flex items-center gap-2 shrink-0">
        <button onClick={() => router.back()} className="p-1.5 text-gray-500">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{title}</p>
        </div>
        <button onClick={() => refetch()} className="text-xs text-indigo-600 px-2">Refresh</button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 bg-gray-50">
        {isLoading && <Loading message="Loading messages..." />}
        {error && <ErrorDisplay message={String(error)} onRetry={refetch} />}
        {!isLoading && !error && sortedMessages.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">No messages yet. Start the conversation!</p>
        )}
        {sortedMessages.map(msg => (
          <MessageBubble key={msg.id} message={msg} isMe={msg.senderId === user?.id} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-3 py-2 flex items-end gap-2 shrink-0">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 resize-none border border-gray-300 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 max-h-24"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isSending}
          className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-700 active:scale-95 transition-all shrink-0"
        >
          {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
