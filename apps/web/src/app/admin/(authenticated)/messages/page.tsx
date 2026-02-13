'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { webSocketManager } from '@/lib/websocket';
import { useAuth } from '@/lib/auth-context';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { PageLoading } from '@/components/loading';
import { Dialog } from '@/components/dialog';
import { UserSearchDialog } from '@/components/user-search-dialog';
import { Button } from '@/components/button';

interface Conversation {
  id: number;
  type?: string;
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
  const [showNewConv, setShowNewConv] = useState(false);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [addAdminId, setAddAdminId] = useState('');
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
      api.markConversationAsRead(convId).catch(() => {});
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

  const handleCreateConversation = async (users: { id: number; email: string }[]) => {
    try {
      const res = (await api.createConversationFromAdmin(users.map((u) => u.id))) as { id: number };
      toast.success('Conversation created');
      setShowNewConv(false);
      await loadConversations();
      if (res?.id) setActiveConv(res.id);
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleAddAdmin = async () => {
    if (!activeConv || !addAdminId) return;
    try {
      await api.addAdminToConversation(activeConv, parseInt(addAdminId, 10));
      toast.success('Admin added to conversation');
      setShowAddAdmin(false);
      setAddAdminId('');
      loadConversations();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const getConversationTitle = (conv: Conversation) => {
    const others = conv.participants.filter((p) => p.id !== user?.id);
    if (others.length === 0) return 'Self';
    if (others.length === 1) return others[0].username || others[0].email;
    return others.map((p) => p.username || p.email).join(', ');
  };

  const activeConvData = conversations.find((c) => c.id === activeConv);
  const isGroup = activeConvData?.type === 'GROUP' || (activeConvData?.participants?.length ?? 0) > 2;

  if (loading) return <PageLoading />;

  return (
    <div>
      <PageHeader
        title="Messages"
        actions={
          <Button variant="primary" size="lg" onClick={() => setShowNewConv(true)}>
            New Conversation
          </Button>
        }
      />
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
                    <span className="font-medium text-sm truncate max-w-[200px]">{getConversationTitle(conv)}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {conv.type === 'GROUP' && <span className="text-xs text-gray-400">GROUP</span>}
                      {(conv.unreadCount ?? 0) > 0 && (
                        <span className="bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
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
              {/* Conversation header */}
              <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <div>
                  <span className="text-sm font-medium">{activeConvData ? getConversationTitle(activeConvData) : ''}</span>
                  {activeConvData && (
                    <span className="text-xs text-gray-400 ml-2">
                      {activeConvData.participants.length} participant(s)
                    </span>
                  )}
                </div>
                {isGroup && (
                  <Button size="xs" onClick={() => { setShowAddAdmin(true); setAddAdminId(''); }} title="Add Admin">
                    <i className="fas fa-user-plus mr-1" /> Add Admin
                  </Button>
                )}
              </div>
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
                  <Button size="lg" onClick={sendMessage}>
                    <i className="fas fa-paper-plane" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* New Conversation Dialog (multi-user search) */}
      <UserSearchDialog
        open={showNewConv}
        onClose={() => setShowNewConv(false)}
        onSelect={() => {}}
        multiSelect
        onMultiSelect={handleCreateConversation}
        title="New Conversation"
      />

      {/* Add Admin Dialog */}
      <Dialog open={showAddAdmin} onClose={() => setShowAddAdmin(false)} title="Add Admin to Conversation">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Admin User ID</label>
            <input type="number" value={addAdminId} onChange={(e) => setAddAdminId(e.target.value)} placeholder="Enter admin user ID" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowAddAdmin(false)}>Cancel</Button>
            <Button onClick={handleAddAdmin}>Add Admin</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
