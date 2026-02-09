import React from 'react';
import LegacyPage from '@/components/LegacyPage';
import { api } from '@/lib/api';
import { AdminCommon } from '@/lib/adminCommon';

const auditHtml = `
  <div class="content-wrapper">
    <div class="content-header">
      <div class="container-fluid">
        <div class="row mb-2">
          <div class="col-sm-6"><h1 class="m-0">Audit Logs</h1></div>
        </div>
      </div>
    </div>
    <section class="content">
      <div class="container-fluid">
        <div class="card">
          <div class="card-body">
            <table id="auditTable" class="table table-bordered table-striped">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Details</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colspan="6" class="text-center text-muted">Loading...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  </div>

  <div class="modal fade" id="auditLogDetailsModal" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-xl" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Audit Log Details</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <ul class="nav nav-tabs" id="auditLogDetailsTabs" role="tablist">
            <li class="nav-item">
              <a class="nav-link active" id="basicInfo-tab" data-toggle="tab" href="#basicInfo" role="tab" aria-controls="basicInfo" aria-selected="true">
                <i class="fas fa-info-circle"></i> Basic Info
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" id="details-tab" data-toggle="tab" href="#details" role="tab" aria-controls="details" aria-selected="false">
                <i class="fas fa-code"></i> Details
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" id="metadata-tab" data-toggle="tab" href="#metadata" role="tab" aria-controls="metadata" aria-selected="false">
                <i class="fas fa-server"></i> Metadata
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" id="relatedUser-tab" data-toggle="tab" href="#relatedUser" role="tab" aria-controls="relatedUser" aria-selected="false">
                <i class="fas fa-user"></i> Related User
              </a>
            </li>
          </ul>
          <div class="tab-content mt-3" id="auditLogDetailsTabContent">
            <div class="tab-pane fade show active" id="basicInfo" role="tabpanel">
              <table class="table table-bordered">
                <tr><th width="30%">ID</th><td id="auditLogId">-</td></tr>
                <tr><th>Time</th><td id="auditLogTime">-</td></tr>
                <tr><th>User</th><td id="auditLogUser">-</td></tr>
                <tr><th>Action</th><td id="auditLogAction">-</td></tr>
                <tr><th>Entity Type</th><td id="auditLogEntityType">-</td></tr>
                <tr><th>Entity ID</th><td id="auditLogEntityId">-</td></tr>
              </table>
            </div>
            <div class="tab-pane fade" id="details" role="tabpanel">
              <div id="auditLogDetailsContent">
                <p class="text-muted">Loading...</p>
              </div>
            </div>
            <div class="tab-pane fade" id="metadata" role="tabpanel">
              <table class="table table-bordered">
                <tr><th width="30%">IP Address</th><td id="auditLogIpAddress">-</td></tr>
                <tr><th>User Agent</th><td id="auditLogUserAgent">-</td></tr>
              </table>
            </div>
            <div class="tab-pane fade" id="relatedUser" role="tabpanel">
              <div id="auditLogRelatedUser">
                <p class="text-muted">Loading...</p>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
        </div>
      </div>
    </div>
  </div>

  <footer class="main-footer">
    <strong>Copyright &copy; 2025 BaltazarTV.</strong>
  </footer>
`;

function initAuditPage() {
  let logsTable: { destroy: () => void } | null = null;
  const globalWindow = window as unknown as Record<string, unknown>;

  AdminCommon.init();

  async function loadAuditLogs() {
    const tableContainer =
      document.querySelector('.card-body') ||
      document.querySelector('#auditTable')?.parentElement;
    try {
      if (tableContainer) {
        AdminCommon.showContainerLoader(tableContainer, 'Loading audit logs...');
      }

      const logs = (await api.getAuditLogs({ page: 1, limit: 100 })) as {
        data?: Array<Record<string, unknown>>;
      };
      const tbody = document.querySelector('#auditTable tbody');

      if (logsTable) {
        logsTable.destroy();
      }

      if (tbody && logs.data && logs.data.length > 0) {
        tbody.innerHTML = logs.data
          .map(
            (log) => `
          <tr>
            <td>${AdminCommon.formatDate(String(log.createdAt || ''))}</td>
            <td>${log.userEmail || 'System'}</td>
            <td><span class="badge badge-info">${log.action}</span></td>
            <td>${log.entityType}${log.entityId ? ' #' + log.entityId : ''}</td>
            <td><small>${log.details ? JSON.stringify(log.details).substring(0, 50) + '...' : '-'}</small></td>
            <td>
              <button class="btn btn-sm btn-info" onclick="viewAuditLog(${log.id})" title="View Details"><i class="fas fa-eye"></i></button>
            </td>
          </tr>
        `,
          )
          .join('');

        logsTable = AdminCommon.initDataTable(
          '#auditTable',
          {
            order: [[0, 'desc']],
          },
          'auditTable',
        );
      } else if (tbody) {
        tbody.innerHTML =
          '<tr><td colspan="6" class="text-center text-muted">No audit logs found</td></tr>';
      }

      if (tableContainer) {
        AdminCommon.hideContainerLoader(tableContainer);
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      if (tableContainer) {
        AdminCommon.hideContainerLoader(tableContainer);
      }
      const tbody = document.querySelector('#auditTable tbody');
      if (tbody) {
        tbody.innerHTML =
          '<tr><td colspan="6" class="text-center text-danger">Failed to load audit logs</td></tr>';
      }
      AdminCommon.showError(
        `Failed to load audit logs: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  globalWindow.viewAuditLog = async (logId: number) => {
    try {
      const log = (await api.getAuditLog(logId)) as Record<string, unknown>;

      const setText = (id: string, value: string) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
      };

      setText('auditLogId', String(log.id || '-'));
      setText('auditLogTime', AdminCommon.formatDate(String(log.createdAt || '')));
      setText('auditLogUser', String(log.userEmail || 'System'));
      setText('auditLogAction', String(log.action || '-'));
      setText('auditLogEntityType', String(log.entityType || '-'));
      setText('auditLogEntityId', log.entityId ? String(log.entityId) : 'N/A');

      const detailsContent = document.getElementById('auditLogDetailsContent');
      if (detailsContent) {
        if (log.details) {
          detailsContent.innerHTML =
            '<pre class="bg-light p-3 rounded" style="max-height: 400px; overflow-y: auto;">' +
            JSON.stringify(log.details, null, 2) +
            '</pre>';
        } else {
          detailsContent.innerHTML = '<p class="text-muted">No details available</p>';
        }
      }

      setText('auditLogIpAddress', String(log.ipAddress || 'N/A'));
      setText('auditLogUserAgent', String(log.userAgent || 'N/A'));

      const relatedUserContent = document.getElementById('auditLogRelatedUser');
      if (relatedUserContent) {
        if (log.userId) {
          relatedUserContent.innerHTML = `
          <p><strong>User ID:</strong> ${log.userId}</p>
          <p><strong>Email:</strong> ${log.userEmail || 'N/A'}</p>
          <a href="/admin/users" class="btn btn-sm btn-primary" target="_blank">
            <i class="fas fa-external-link-alt"></i> View User
          </a>
        `;
        } else {
          relatedUserContent.innerHTML =
            '<p class="text-muted">No related user</p>';
        }
      }

      window.$?.('#auditLogDetailsModal').modal('show');
    } catch (error) {
      console.error('Failed to load audit log:', error);
      AdminCommon.showError(
        `Failed to load audit log details: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  };

  loadAuditLogs();

  return () => {
    if (logsTable) {
      logsTable.destroy();
      logsTable = null;
    }
    delete globalWindow.viewAuditLog;
  };
}

export default function AuditPage() {
  return <LegacyPage html={auditHtml} onMount={initAuditPage} />;
}
