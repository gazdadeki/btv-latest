'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { webSocketManager } from '@/lib/websocket';
import { useAuth } from '@/lib/auth-context';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { PageLoading } from '@/components/loading';

interface Conversation {
  id: number;
  participants: Array<{ id: number; email: string; username?: string }>;
  lastMessage?: { content: string; createdAt: string };
  unreadCount?: number;
}

interface Message {
  id: number;
  content: string;
  senderId: number;
  createdAt: string;
  sender?: { email: string; username?: string };
}

export default function MessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const res = (await api.getConversations()) as Conversation[];
      setConversations(Array.isArray(res) ? res : []);
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (convId: number) => {
    try {
      const res = (await api.getConversationMessages(convId)) as { data?: Message[] } | Message[];
      const msgs = Array.isArray(res) ? res : (res as { data?: Message[] }).data || [];
      setMessages(msgs);
      webSocketManager.send('messages:join', { conversationId: convId });
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    if (activeConv) loadMessages(activeConv);
    return () => {
      if (activeConv) webSocketManager.send('messages:leave', { conversationId: activeConv });
    };
  }, [activeConv, loadMessages]);

  useEffect(() => {
    const unsubs = [
      webSocketManager.on('message:received', (data) => {
        const msg = data as Message & { conversationId?: number };
        if (msg.conversationId === activeConv) {
          setMessages((prev) => [...prev, msg]);
        }
        loadConversations();
      }),
      webSocketManager.on('unread:updated', () => loadConversations()),
    ];
    return () => unsubs.forEach((u) => u());
  }, [activeConv, loadConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConv) return;
    try {
      await api.sendMessage(activeConv, newMessage.trim());
      setNewMessage('');
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const getOtherParticipant = (conv: Conversation) => {
    const other = conv.participants.find((p) => p.id !== user?.id);
    return other?.username || other?.email || 'Unknown';
  };

  if (loading) return <PageLoading />;

  return (
    <div>
      <PageHeader title="Messages" />
      <div className="bg-white rounded-lg shadow flex" style={{ height: 'calc(100vh - 200px)' }}>
        {/* Conversations list */}
        <div className="w-80 border-r border-gray-200 flex flex-col">
          <div className="p-3 border-b border-gray-200">
            <h3 className="font-semibold text-sm">Conversations</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <p className="text-center text-gray-400 text-sm p-4">No conversations</p>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConv(conv.id)}
                  className={`w-full text-left p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${activeConv === conv.id ? 'bg-indigo-50' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate">{getOtherParticipant(conv)}</span>
                    {(conv.unreadCount ?? 0) > 0 && (
                      <span className="bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  {conv.lastMessage && (
                    <p className="text-xs text-gray-400 truncate mt-1">{conv.lastMessage.content}</p>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 flex flex-col">
          {!activeConv ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              Select a conversation to start messaging
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => {
                  const isMe = msg.senderId === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-lg p-3 ${isMe ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                        {!isMe && (
                          <p className="text-xs font-medium mb-1 opacity-70">
                            {msg.sender?.username || msg.sender?.email || 'Unknown'}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-xs mt-1 ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>
                          {formatDate(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-3 border-t border-gray-200">
                <div className="flex gap-2">
                  <input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={sendMessage}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer"
                  >
                    <i className="fas fa-paper-plane" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
