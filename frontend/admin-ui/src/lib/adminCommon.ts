import { api } from './api';
import { AuthUtils } from './auth';
import { TimezoneUtils } from './timezone';

type AlertType = 'success' | 'danger' | 'warning' | 'info';

export const AdminCommon = {
  async init() {
    AuthUtils.initUserDisplay();
    this.setupLogoutHandler();
    this.verifyAuth();
  },

  async verifyAuth() {
    try {
      if (typeof api.getMe === 'function') {
        const user = await api.getMe();
        if (user && AuthUtils) {
          AuthUtils.setUserCookie(user);
          AuthUtils.initUserDisplay();
        }
      }
    } catch (error) {
      console.debug(
        'Auth verification failed, will be handled by API calls:',
        error,
      );
    }
  },

  setupLogoutHandler() {
    const logoutLink = document.getElementById('logoutLink');
    if (!logoutLink) return;
    logoutLink.addEventListener('click', (event) => {
      event.preventDefault();
      api.logout();
    });
  },

  isCancelledError(error: unknown): boolean {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return true;
    }
    if (error instanceof Error) {
      return (
        error.message === 'Request was cancelled' ||
        error.message.includes('cancelled')
      );
    }
    return false;
  },

  showError(messageOrError: string | Error, container: HTMLElement | null = null) {
    let message = messageOrError;
    if (messageOrError instanceof Error) {
      if (this.isCancelledError(messageOrError)) {
        console.debug('[AdminCommon] Request was cancelled, skipping error display');
        return;
      }
      message = messageOrError.message || 'An error occurred';
    }

    if (
      typeof message === 'string' &&
      (message.includes('cancelled') || message.includes('AbortError'))
    ) {
      console.debug('[AdminCommon] Request was cancelled, skipping error display');
      return;
    }

    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show';
    alertDiv.innerHTML = `
      ${message}
      <button type="button" class="close" data-dismiss="alert" aria-label="Close">
        <span aria-hidden="true">&times;</span>
      </button>
    `;

    const targetContainer =
      container || document.querySelector('.content-header') || document.body;
    targetContainer.insertBefore(alertDiv, targetContainer.firstChild);

    setTimeout(() => {
      if (alertDiv.parentNode) {
        alertDiv.remove();
      }
    }, 5000);
  },

  showSuccess(message: string, container: HTMLElement | null = null) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible fade show';
    alertDiv.innerHTML = `
      ${message}
      <button type="button" class="close" data-dismiss="alert" aria-label="Close">
        <span aria-hidden="true">&times;</span>
      </button>
    `;

    const targetContainer =
      container || document.querySelector('.content-header') || document.body;
    targetContainer.insertBefore(alertDiv, targetContainer.firstChild);

    setTimeout(() => {
      if (alertDiv.parentNode) {
        alertDiv.remove();
      }
    }, 3000);
  },

  showAlert(message: string, type: AlertType = 'info', container: HTMLElement | null = null) {
    const typeMap: Record<AlertType, string> = {
      success: 'alert-success',
      danger: 'alert-danger',
      warning: 'alert-warning',
      info: 'alert-info',
    };

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert ${typeMap[type]} alert-dismissible fade show`;
    alertDiv.innerHTML = `
      ${message}
      <button type="button" class="close" data-dismiss="alert" aria-label="Close">
        <span aria-hidden="true">&times;</span>
      </button>
    `;

    const targetContainer =
      container || document.querySelector('.content-header') || document.body;
    targetContainer.insertBefore(alertDiv, targetContainer.firstChild);

    const dismissTime = type === 'success' ? 3000 : type === 'danger' ? 5000 : 4000;
    setTimeout(() => {
      if (alertDiv.parentNode) {
        alertDiv.remove();
      }
    }, dismissTime);
  },

  showInfo(title: string, htmlContent: string) {
    let modal = document.getElementById('adminInfoModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'adminInfoModal';
      modal.className = 'modal fade';
      modal.setAttribute('tabindex', '-1');
      modal.setAttribute('role', 'dialog');
      modal.innerHTML = `
        <div class="modal-dialog modal-lg" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="adminInfoModalTitle"></h5>
              <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body" id="adminInfoModalBody"></div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    const titleEl = document.getElementById('adminInfoModalTitle');
    const bodyEl = document.getElementById('adminInfoModalBody');
    if (titleEl) titleEl.textContent = title;
    if (bodyEl) bodyEl.innerHTML = htmlContent;
    window.$?.('#adminInfoModal').modal('show');
  },

  formatDate(date: string | Date): string {
    if (!date) return 'N/A';
    return TimezoneUtils.formatDateUTC(date, { includeTime: true });
  },

  formatDateOnly(date: string | Date): string {
    if (!date) return 'N/A';
    return TimezoneUtils.formatDateOnlyUTC(date);
  },

  formatTime(date: string | Date): string {
    if (!date) return '';
    return TimezoneUtils.formatTimeUTC(date, { hour12: false });
  },

  formatDateTime(date: string | Date): string {
    if (!date) return '';
    return TimezoneUtils.formatDateTimeUTC(date);
  },

  formatTimeAgo(date: string | Date): string {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) {
      return 'just now';
    }
    if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    }
    if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    }
    if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    }
    return this.formatDate(d);
  },

  showFullScreenLoader(message = 'Loading...') {
    this.hideFullScreenLoader();
    const overlay = document.createElement('div');
    overlay.id = 'adminFullScreenLoader';
    overlay.className = 'admin-fullscreen-loader';
    overlay.innerHTML = `
      <div class="admin-loader-content">
        <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
          <span class="sr-only">Loading...</span>
        </div>
        <p class="mt-3 text-muted">${message}</p>
      </div>
    `;
    document.body.appendChild(overlay);
  },

  hideFullScreenLoader() {
    const loader = document.getElementById('adminFullScreenLoader');
    if (loader) {
      loader.remove();
    }
  },

  showButtonLoader(button: HTMLElement | string, disable = true) {
    const btn =
      typeof button === 'string'
        ? (document.querySelector(button) as HTMLElement | null)
        : button;
    if (!btn) return;

    if (!btn.dataset.originalHtml) {
      btn.dataset.originalHtml = btn.innerHTML;
    }
    if (!btn.dataset.originalDisabled) {
      btn.dataset.originalDisabled = String(btn.hasAttribute('disabled'));
    }

    btn.innerHTML =
      '<span class="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>Loading...';
    if (disable) {
      btn.setAttribute('disabled', 'true');
    }
  },

  hideButtonLoader(button: HTMLElement | string) {
    const btn =
      typeof button === 'string'
        ? (document.querySelector(button) as HTMLElement | null)
        : button;
    if (!btn) return;

    if (btn.dataset.originalHtml) {
      btn.innerHTML = btn.dataset.originalHtml;
      delete btn.dataset.originalHtml;
    }

    if (btn.dataset.originalDisabled !== undefined) {
      const disabled = btn.dataset.originalDisabled === 'true';
      if (disabled) {
        btn.setAttribute('disabled', 'true');
      } else {
        btn.removeAttribute('disabled');
      }
      delete btn.dataset.originalDisabled;
    } else {
      btn.removeAttribute('disabled');
    }
  },

  showContainerLoader(container: HTMLElement | string, message = 'Loading...') {
    const cont =
      typeof container === 'string'
        ? document.querySelector(container)
        : container;
    if (!cont) return;
    this.hideContainerLoader(container);
    const loader = document.createElement('div');
    loader.className = 'admin-container-loader';
    loader.innerHTML = `
      <div class="text-center p-4">
        <div class="spinner-border text-primary" role="status">
          <span class="sr-only">Loading...</span>
        </div>
        <p class="mt-2 text-muted">${message}</p>
      </div>
    `;
    cont.appendChild(loader);
  },

  hideContainerLoader(container: HTMLElement | string) {
    const cont =
      typeof container === 'string'
        ? document.querySelector(container)
        : container;
    if (!cont) return;
    const loader = cont.querySelector('.admin-container-loader');
    if (loader) {
      loader.remove();
    }
  },

  getDataTablePageLength(tableId: string, defaultValue = 10): number {
    try {
      const cached = localStorage.getItem(`datatable_pageLength_${tableId}`);
      if (cached) {
        const length = parseInt(cached, 10);
        if (length > 0) {
          return length;
        }
      }
    } catch (error) {
      console.warn('Failed to read DataTable page length from localStorage:', error);
    }
    return defaultValue;
  },

  setDataTablePageLength(tableId: string, pageLength: number) {
    try {
      localStorage.setItem(
        `datatable_pageLength_${tableId}`,
        pageLength.toString(),
      );
    } catch (error) {
      console.warn('Failed to save DataTable page length to localStorage:', error);
    }
  },

  initDataTable(
    selector: string,
    options: Record<string, unknown> = {},
    tableId: string | null = null,
  ) {
    const id = tableId || selector.replace('#', '');
    const cachedPageLength = this.getDataTablePageLength(
      id,
      (options.pageLength as number) || 10,
    );

    const defaultOptions = {
      destroy: true,
      paging: true,
      lengthChange: true,
      searching: true,
      ordering: true,
      info: true,
      autoWidth: false,
      pageLength: cachedPageLength,
    };

    const finalOptions = { ...defaultOptions, ...options };
    const jquery = window.$ || window.jQuery;
    const dataTableFactory =
      (jquery as { fn?: { DataTable?: unknown } } | undefined)?.fn?.DataTable;
    if (!jquery || typeof dataTableFactory !== 'function') {
      console.error('DataTables is not available for this page.');
      return null;
    }
    const table = jquery(selector).DataTable(finalOptions);
    table.on('length.dt', ((...args: unknown[]) => {
      const len = args[2] as number;
      this.setDataTablePageLength(id, len);
    }) as (...args: unknown[]) => void);
    return table;
  },

  async updateUnreadBadge() {
    try {
      const response = await api.getUnreadCount();
      this.updateUnreadBadgeFromCount(response.count);
    } catch (error) {
      console.debug('Failed to update unread badge:', error);
    }
  },

  updateUnreadBadgeFromCount(count: number) {
    const badge = document.getElementById('unreadBadge');
    if (!badge) return;
    if (count > 0) {
      badge.textContent = String(count);
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  },
};

if (typeof window !== 'undefined') {
  window.AdminCommon = AdminCommon;
}
