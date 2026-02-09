import React from 'react';
import LegacyPage from '@/components/LegacyPage';
import { api } from '@/lib/api';
import { AdminCommon } from '@/lib/adminCommon';
import { AuthUtils } from '@/lib/auth';
import { webSocketManager } from '@/lib/websocketManager';

const messagesHtml = `
  <div class="content-wrapper">
    <div class="content-header">
      <div class="container-fluid">
        <div class="row mb-2">
          <div class="col-sm-6">
            <h1 class="m-0">Messages</h1>
          </div>
        </div>
      </div>
    </div>

    <section class="content">
      <div class="container-fluid">
        <div class="row">
          <div class="col-md-4">
            <div class="card card-primary card-outline direct-chat direct-chat-primary">
              <div class="card-header">
                <h3 class="card-title">Conversations</h3>
                <div class="card-tools">
                  <button type="button" class="btn btn-sm btn-primary" id="newConversationBtn" title="New Conversation">
                    <i class="fas fa-plus"></i> New
                  </button>
                  <span class="badge badge-primary ml-2" id="conversationCount">0</span>
                </div>
              </div>
              <div class="card-body">
                <div class="direct-chat-messages" id="conversationList" style="height: 600px; overflow-y: auto">
                  <div class="text-center p-4" id="conversationListEmpty">
                    <p class="text-muted">No conversations yet</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="col-md-8">
            <div class="card card-primary card-outline direct-chat direct-chat-primary">
              <div class="card-header" id="conversationHeader" style="display: none">
                <h3 class="card-title" id="conversationTitle">Select a conversation</h3>
                <div class="card-tools">
                  <button type="button" class="btn btn-tool" id="addAdminBtn" style="display: none" title="Add Admin">
                    <i class="fas fa-user-plus"></i>
                  </button>
                </div>
              </div>
              <div class="card-body" id="messageView" style="display: none">
                <div class="direct-chat-messages" id="messageList" style="height: 500px; overflow-y: auto"></div>
              </div>
              <div class="card-footer" id="messageInputContainer" style="display: none">
                <form id="messageForm">
                  <div class="input-group">
                    <input type="text" id="messageInput" name="message" placeholder="Type Message ..." class="form-control" maxlength="10000" />
                    <span class="input-group-append">
                      <button type="submit" class="btn btn-primary">Send</button>
                    </span>
                  </div>
                </form>
                <div id="typingIndicator" class="text-muted small mt-2" style="display: none"></div>
              </div>
              <div class="card-body" id="noConversationSelected">
                <div class="text-center p-5">
                  <i class="fas fa-comments fa-3x text-muted mb-3"></i>
                  <p class="text-muted">Select a conversation to view messages</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>

  <div class="modal fade" id="newConversationModal" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-lg" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h4 class="modal-title">New Conversation</h4>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="recipientSearch">Search for recipients</label>
            <input type="text" id="recipientSearch" class="form-control" placeholder="Type to search users by email or name..." autocomplete="off" />
            <small class="form-text text-muted">You can add multiple recipients</small>
          </div>
          <div id="searchResults" class="list-group" style="max-height: 300px; overflow-y: auto; display: none"></div>
          <div class="form-group mt-3">
            <label>Selected Recipients:</label>
            <div id="selectedRecipients" class="d-flex flex-wrap" style="gap: 0.5rem"></div>
            <small id="noRecipientsSelected" class="form-text text-muted">No recipients selected yet</small>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
          <button type="button" class="btn btn-primary" id="createConversationBtn" disabled>Create Conversation</button>
        </div>
      </div>
    </div>
  </div>

  <footer class="main-footer">
    <strong>Copyright &copy; 2025 BaltazarTV.</strong>
  </footer>
`;

function initMessagesPage() {
  let currentConversationId: number | null = null;
  let conversations: Array<Record<string, unknown>> = [];
  let typingTimeout: ReturnType<typeof setTimeout> | null = null;
  let selectedRecipients: Array<{ id: number; email: string }> = [];
  let searchTimeout: ReturnType<typeof setTimeout> | null = null;
  let allUsers: Array<Record<string, unknown>> = [];

  const globalWindow = window as unknown as Record<string, unknown>;

  AdminCommon.init();

  function updateUnreadBadgeFromEvent(count: number) {
    const badge = document.getElementById('unreadBadge');
    if (!badge) return;
    if (count > 0) {
      badge.textContent = String(count);
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }

  function renderConversationList() {
    const container = document.getElementById('conversationList');
    const emptyState = document.getElementById('conversationListEmpty');
    const countBadge = document.getElementById('conversationCount');

    if (!container) return;
    if (countBadge) countBadge.textContent = String(conversations.length);

    if (conversations.length === 0) {
      container.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }
    if (emptyState) emptyState.style.display = 'none';

    container.innerHTML = conversations
      .map((conv) => {
        const participants = (conv.participants as Array<Record<string, unknown>>) || [];
        const participant = participants[0] || {};
        const lastMessage = conv.lastMessage as Record<string, unknown> | undefined;
        const unreadBadge =
          (conv.unreadCount as number) > 0
            ? `<span class="badge badge-danger float-right">${conv.unreadCount}</span>`
            : '';
        const timeAgo = lastMessage
          ? AdminCommon.formatTimeAgo(String(lastMessage.createdAt || ''))
          : '';
        const preview = lastMessage
          ? String(lastMessage.content || '').length > 50
            ? `${String(lastMessage.content || '').substring(0, 50)}...`
            : lastMessage.content
          : 'No messages yet';

        return `
        <div class="direct-chat-msg ${conv.id === currentConversationId ? 'active' : ''}" 
             onclick="selectConversation(${conv.id}, this)" 
             style="cursor: pointer; padding: 10px; border-bottom: 1px solid #dee2e6;">
          <div class="direct-chat-infos clearfix">
            <span class="direct-chat-name float-left">${participant.email || 'Unknown'}</span>
            <span class="direct-chat-timestamp float-right">${timeAgo}</span>
          </div>
          <div class="direct-chat-text" style="margin-top: 5px;">
            ${preview}
            ${unreadBadge}
          </div>
        </div>
      `;
      })
      .join('');

    if (!document.getElementById('messagesStyle')) {
      const style = document.createElement('style');
      style.id = 'messagesStyle';
      style.textContent = `
        .direct-chat-msg.active { background-color: #e3f2fd; }
        .direct-chat-msg:hover { background-color: #f5f5f5; }
      `;
      document.head.appendChild(style);
    }
  }

  async function updateUnreadBadge() {
    try {
      const response = await api.getUnreadCount();
      updateUnreadBadgeFromEvent(response.count);
    } catch (error) {
      console.error('Failed to get unread count:', error);
    }
  }

  async function loadConversations() {
    try {
      const previousActiveId = currentConversationId;
      const data = (await api.getConversations()) as Array<Record<string, unknown>>;
      conversations = data || [];
      renderConversationList();

      if (previousActiveId) {
        const convElement = Array.from(
          document.querySelectorAll('.direct-chat-msg'),
        ).find((el) => {
          const onclick = el.getAttribute('onclick');
          return onclick && onclick.includes(`selectConversation(${previousActiveId}`);
        });
        if (convElement) {
          document.querySelectorAll('.direct-chat-msg').forEach((el) => {
            el.classList.remove('active');
          });
          convElement.classList.add('active');
        }
      }
      updateUnreadBadge();
    } catch (error) {
      console.error('Failed to load conversations:', error);
      AdminCommon.showAlert('Failed to load conversations', 'danger');
    }
  }

  function renderMessages(messages: Array<Record<string, unknown>>) {
    const container = document.getElementById('messageList');
    const currentUser = AuthUtils.getUser();
    if (!container) return;

    if (!messages.length) {
      container.innerHTML = '<div class="text-center text-muted p-4">No messages yet</div>';
      return;
    }

    container.innerHTML = messages
      .map((msg) => {
        const isOwn = msg.senderId === currentUser?.id;
        const alignClass = isOwn ? 'right' : 'left';
        const bgClass = isOwn ? 'primary' : 'light';
        const time = AdminCommon.formatDateTime(String(msg.createdAt || ''));
        const sender = (msg.sender as Record<string, unknown>) || {};
        return `
        <div class="direct-chat-msg ${alignClass}">
          <div class="direct-chat-infos clearfix">
            <span class="direct-chat-name float-${alignClass}">${sender.email || 'Unknown'}</span>
            <span class="direct-chat-timestamp float-${alignClass === 'left' ? 'right' : 'left'}">${time}</span>
          </div>
          <div class="direct-chat-text bg-${bgClass}">
            ${escapeHtml(String(msg.content || ''))}
          </div>
        </div>
      `;
      })
      .join('');
    container.scrollTop = container.scrollHeight;
  }

  async function loadMessages(conversationId: number) {
    try {
      const response = (await api.getConversationMessages(conversationId, 1, 50)) as {
        messages?: Array<Record<string, unknown>>;
      };
      renderMessages(response.messages || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
      AdminCommon.showAlert('Failed to load messages', 'danger');
    }
  }

  async function loadConversation(conversationId: number) {
    try {
      const conversation = (await api.getConversation(conversationId)) as Record<
        string,
        unknown
      >;
      const participant =
        ((conversation.participants as Array<Record<string, unknown>>) || [])[0] ||
        {};
      const header = document.getElementById('conversationHeader');
      const title = document.getElementById('conversationTitle');
      const messageView = document.getElementById('messageView');
      const inputContainer = document.getElementById('messageInputContainer');
      const emptyState = document.getElementById('noConversationSelected');
      if (title) title.textContent = String(participant.email || 'Unknown');
      if (header) header.style.display = 'block';
      if (messageView) messageView.style.display = 'block';
      if (inputContainer) inputContainer.style.display = 'block';
      if (emptyState) emptyState.style.display = 'none';

      const addAdminBtn = document.getElementById('addAdminBtn');
      if (addAdminBtn) {
        addAdminBtn.style.display = conversation.type === 'GROUP' ? 'inline-block' : 'none';
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
      AdminCommon.showAlert('Failed to load conversation', 'danger');
    }
  }

  function handleMessageReceived(message: Record<string, unknown>) {
    if (message.conversationId === currentConversationId) {
      const container = document.getElementById('messageList');
      const currentUser = AuthUtils.getUser();
      if (!container || !currentUser) return;
      const isOwn = message.senderId === currentUser.id;
      const alignClass = isOwn ? 'right' : 'left';
      const bgClass = isOwn ? 'primary' : 'light';
      const time = AdminCommon.formatDateTime(String(message.createdAt || ''));
      const sender = (message.sender as Record<string, unknown>) || {};
      const messageHtml = `
        <div class="direct-chat-msg ${alignClass}">
          <div class="direct-chat-infos clearfix">
            <span class="direct-chat-name float-${alignClass}">${sender.email || 'Unknown'}</span>
            <span class="direct-chat-timestamp float-${alignClass === 'left' ? 'right' : 'left'}">${time}</span>
          </div>
          <div class="direct-chat-text bg-${bgClass}">
            ${escapeHtml(String(message.content || ''))}
          </div>
        </div>
      `;
      container.insertAdjacentHTML('beforeend', messageHtml);
      container.scrollTop = container.scrollHeight;

      if (!isOwn && currentConversationId) {
        api.markConversationAsRead(currentConversationId).catch(() => undefined);
      }
    }
    loadConversations();
  }

  function showTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (!indicator) return;
    indicator.textContent = 'Someone is typing...';
    indicator.style.display = 'block';
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    typingTimeout = setTimeout(() => {
      hideTypingIndicator();
    }, 3000);
  }

  function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
      indicator.style.display = 'none';
    }
  }

  function escapeHtml(text: string) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function setupRecipientSearch() {
    const searchInput = document.getElementById('recipientSearch') as HTMLInputElement | null;
    const searchResults = document.getElementById('searchResults');
    if (!searchInput || !searchResults) return;

    searchInput.addEventListener('input', (event) => {
      const query = (event.target as HTMLInputElement).value.trim().toLowerCase();
      if (searchTimeout) clearTimeout(searchTimeout);
      if (query.length < 2) {
        searchResults.style.display = 'none';
        return;
      }
      searchTimeout = setTimeout(() => {
        performUserSearch(query);
      }, 300);
    });

    searchInput.addEventListener('focus', () => {
      const query = searchInput.value.trim().toLowerCase();
      if (query.length >= 2) {
        performUserSearch(query);
      }
    });

    document.addEventListener('click', (event) => {
      if (
        !searchInput.contains(event.target as Node) &&
        !searchResults.contains(event.target as Node)
      ) {
        searchResults.style.display = 'none';
      }
    });
  }

  function performUserSearch(query: string) {
    const searchResults = document.getElementById('searchResults');
    if (!searchResults) return;
    const selectedIds = selectedRecipients.map((r) => r.id);
    const filtered = allUsers.filter((user) => {
      const id = Number(user.id);
      if (selectedIds.includes(id)) return false;
      const email = String(user.email || '').toLowerCase();
      return email.includes(query);
    });

    if (filtered.length === 0) {
      searchResults.innerHTML =
        '<div class="list-group-item text-muted">No users found</div>';
      searchResults.style.display = 'block';
      return;
    }

    searchResults.innerHTML = filtered
      .map(
        (user) => `
      <a href="#" class="list-group-item list-group-item-action" data-user-id="${user.id}" data-user-email="${escapeHtml(String(user.email || ''))}" style="cursor: pointer;">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <strong>${escapeHtml(String(user.email || ''))}</strong>
            <br>
            <small class="text-muted">
              ${user.role === 'admin' ? '<span class="badge badge-primary">Admin</span>' : '<span class="badge badge-info">Player</span>'}
              ${user.isVerified ? '<span class="badge badge-success ml-1">Verified</span>' : '<span class="badge badge-warning ml-1">Unverified</span>'}
            </small>
          </div>
          <i class="fas fa-plus text-primary"></i>
        </div>
      </a>
    `,
      )
      .join('');

    searchResults.querySelectorAll('a[data-user-id]').forEach((item) => {
      item.addEventListener('click', (event) => {
        event.preventDefault();
        const userId = parseInt(item.getAttribute('data-user-id') || '0', 10);
        const userEmail = item.getAttribute('data-user-email') || '';
        addRecipient(userId, userEmail);
        const input = document.getElementById('recipientSearch') as HTMLInputElement | null;
        if (input) input.value = '';
        searchResults.style.display = 'none';
      });
    });

    searchResults.style.display = 'block';
  }

  function renderSelectedRecipients() {
    const container = document.getElementById('selectedRecipients');
    const noRecipients = document.getElementById('noRecipientsSelected');
    if (!container || !noRecipients) return;

    if (!selectedRecipients.length) {
      container.innerHTML = '';
      noRecipients.style.display = 'block';
      return;
    }

    noRecipients.style.display = 'none';
    container.innerHTML = selectedRecipients
      .map(
        (recipient) => `
      <span class="badge badge-primary p-2 d-inline-flex align-items-center" style="font-size: 0.9rem;">
        ${escapeHtml(recipient.email)}
        <button type="button" class="btn btn-sm p-0 ml-2 text-white" style="background: none; border: none; font-size: 1rem; line-height: 1;" onclick="removeRecipientFromModal(${recipient.id})" title="Remove">
          <i class="fas fa-times"></i>
        </button>
      </span>
    `,
      )
      .join('');
  }

  function updateCreateButtonState() {
    const btn = document.getElementById('createConversationBtn') as HTMLButtonElement | null;
    if (btn) btn.disabled = selectedRecipients.length === 0;
  }

  function addRecipient(userId: number, userEmail: string) {
    if (selectedRecipients.some((r) => r.id === userId)) return;
    selectedRecipients.push({ id: userId, email: userEmail });
    renderSelectedRecipients();
    updateCreateButtonState();
  }

  function removeRecipient(userId: number) {
    selectedRecipients = selectedRecipients.filter((r) => r.id !== userId);
    renderSelectedRecipients();
    updateCreateButtonState();
  }

  async function loadAllUsers() {
    try {
      const response = await api.getUsers({});
      allUsers = Array.isArray(response)
        ? (response as Array<Record<string, unknown>>)
        : ((response as { data?: Array<Record<string, unknown>> }).data || []);
    } catch (error) {
      console.error('Failed to load users:', error);
      allUsers = [];
    }
  }

  function showNewConversationModal() {
    selectedRecipients = [];
    const input = document.getElementById('recipientSearch') as HTMLInputElement | null;
    if (input) input.value = '';
    const searchResults = document.getElementById('searchResults');
    if (searchResults) {
      searchResults.style.display = 'none';
      searchResults.innerHTML = '';
    }
    const selectedRecipientsEl = document.getElementById('selectedRecipients');
    if (selectedRecipientsEl) selectedRecipientsEl.innerHTML = '';
    const noRecipients = document.getElementById('noRecipientsSelected');
    if (noRecipients) noRecipients.style.display = 'block';
    const createBtn = document.getElementById('createConversationBtn') as HTMLButtonElement | null;
    if (createBtn) createBtn.disabled = true;
    window.$?.('#newConversationModal').modal('show');
    loadAllUsers();
  }

  async function startNewConversation(targetUserIds: number[]) {
    try {
      const conversation = (await api.createConversationFromAdmin(
        targetUserIds,
      )) as { id?: number };
      AdminCommon.showAlert('Conversation created successfully', 'success');
      window.$?.('#newConversationModal').modal('hide');
      await loadConversations();
      setTimeout(() => {
        const convElement = Array.from(
          document.querySelectorAll('.direct-chat-msg'),
        ).find((el) => {
          const onclick = el.getAttribute('onclick');
          return onclick && conversation.id && onclick.includes(`selectConversation(${conversation.id}`);
        });
        if (conversation.id && convElement) {
          (globalWindow.selectConversation as (id: number, el: Element | null) => void)(
            conversation.id,
            convElement,
          );
        }
      }, 500);
    } catch (error) {
      console.error('Failed to create conversation:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to create conversation';
      AdminCommon.showAlert(message, 'danger');
    }
  }

  function setupEventListeners() {
    document.getElementById('newConversationBtn')?.addEventListener('click', showNewConversationModal);
    setupRecipientSearch();
    document.getElementById('createConversationBtn')?.addEventListener('click', async () => {
      if (!selectedRecipients.length) {
        AdminCommon.showAlert('Please select at least one recipient', 'warning');
        return;
      }
      const ids = selectedRecipients.map((r) => r.id);
      await startNewConversation(ids);
    });

    document.getElementById('messageForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      await sendMessage();
    });

    const messageInput = document.getElementById('messageInput') as HTMLInputElement | null;
    let typingTimer: ReturnType<typeof setTimeout> | null = null;
    messageInput?.addEventListener('input', () => {
      if (
        currentConversationId &&
        webSocketManager.getConnectionState()
      ) {
        webSocketManager.emit('messages:typing', {
          conversationId: currentConversationId,
          isTyping: true,
        });
        if (typingTimer) clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
          if (webSocketManager.getConnectionState()) {
            webSocketManager.emit('messages:typing', {
              conversationId: currentConversationId,
              isTyping: false,
            });
          }
        }, 1000);
      }
    });

    document.getElementById('addAdminBtn')?.addEventListener('click', () => {
      const adminId = prompt('Enter admin user ID to add:');
      if (adminId && currentConversationId) {
        addAdminToConversation(parseInt(adminId, 10));
      }
    });
  }

  async function sendMessage() {
    const input = document.getElementById('messageInput') as HTMLInputElement | null;
    if (!input || !currentConversationId) return;
    const content = input.value.trim();
    if (!content) return;

    try {
      await api.sendMessage(currentConversationId, content);
      input.value = '';
      if (webSocketManager.getConnectionState()) {
        webSocketManager.emit('messages:typing', {
          conversationId: currentConversationId,
          isTyping: false,
        });
      }
      await loadMessages(currentConversationId);
      await loadConversations();
    } catch (error) {
      console.error('Failed to send message:', error);
      AdminCommon.showAlert('Failed to send message', 'danger');
    }
  }

  async function addAdminToConversation(adminId: number) {
    try {
      if (!currentConversationId) return;
      await api.addAdminToConversation(currentConversationId, adminId);
      AdminCommon.showAlert('Admin added to conversation', 'success');
      await loadConversation(currentConversationId);
      await loadConversations();
    } catch (error) {
      console.error('Failed to add admin:', error);
      AdminCommon.showAlert('Failed to add admin to conversation', 'danger');
    }
  }

  globalWindow.selectConversation = async (conversationId: number, element?: Element | null) => {
    currentConversationId = conversationId;
    document.querySelectorAll('.direct-chat-msg').forEach((el) => {
      el.classList.remove('active');
    });
    if (element) {
      element.classList.add('active');
    } else {
      const convElement = Array.from(document.querySelectorAll('.direct-chat-msg')).find((el) =>
        el.getAttribute('onclick')?.includes(`selectConversation(${conversationId})`),
      );
      convElement?.classList.add('active');
    }

    if (webSocketManager.getConnectionState()) {
      webSocketManager.emit('messages:join', { conversationId });
    }

    await loadConversation(conversationId);
    await loadMessages(conversationId);

    try {
      await api.markConversationAsRead(conversationId);
      const conv = conversations.find((c) => c.id === conversationId);
      if (conv) {
        conv.unreadCount = 0;
        renderConversationList();
        updateUnreadBadge();
      }
    } catch (error) {
      console.error('Failed to mark conversation as read:', error);
    }
  };

  globalWindow.removeRecipientFromModal = (userId: number) => {
    removeRecipient(userId);
  };

  const wsUnsubscribers = [
    webSocketManager.onConnect(() => {
      conversations.forEach((conv) => {
        webSocketManager.emit('messages:join', { conversationId: conv.id });
      });
    }),
    webSocketManager.on('message:received', (message) => {
      handleMessageReceived(message as Record<string, unknown>);
    }),
    webSocketManager.on('typing:start', () => {
      showTypingIndicator();
    }),
    webSocketManager.on('typing:stop', () => {
      hideTypingIndicator();
    }),
    webSocketManager.on('message:error', (error) => {
      console.error('Message error:', error);
      AdminCommon.showAlert('Error sending message', 'danger');
    }),
    webSocketManager.on('unread:updated', (data) => {
      const payload = data as { count?: number };
      if (typeof payload.count === 'number') {
        updateUnreadBadgeFromEvent(payload.count);
      }
    }),
    webSocketManager.on('conversation:created', () => loadConversations()),
    webSocketManager.on('conversation:updated', () => loadConversations()),
  ];

  const targetUserId = sessionStorage.getItem('startConversationWithUserId');
  if (targetUserId) {
    sessionStorage.removeItem('startConversationWithUserId');
    setTimeout(() => {
      startNewConversation([parseInt(targetUserId, 10)]);
    }, 1000);
  }

  updateUnreadBadge();
  loadConversations();
  setupEventListeners();

  return () => {
    wsUnsubscribers.forEach((unsubscribe) => unsubscribe());
  };
}

export default function MessagesPage() {
  return <LegacyPage html={messagesHtml} onMount={initMessagesPage} />;
}
