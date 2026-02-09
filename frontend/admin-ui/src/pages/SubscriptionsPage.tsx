import React from 'react';
import LegacyPage from '@/components/LegacyPage';
import { api } from '@/lib/api';
import { AdminCommon } from '@/lib/adminCommon';

const subscriptionsHtml = `
  <div class="content-wrapper">
    <div class="content-header">
      <div class="container-fluid">
        <div class="row mb-2">
          <div class="col-sm-6"><h1 class="m-0">Subscriptions</h1></div>
        </div>
      </div>
    </div>
    <section class="content">
      <div class="container-fluid">
        <div class="card">
          <div class="card-body">
            <table id="subscriptionsTable" class="table table-bordered table-striped">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>User</th>
                  <th>Tier</th>
                  <th>Status</th>
                  <th>Period Start</th>
                  <th>Period End</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colspan="7" class="text-center">Loading...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  </div>
  <footer class="main-footer">
    <strong>Copyright &copy; 2025 BaltazarTV.</strong>
  </footer>
`;

function initSubscriptionsPage() {
  let subscriptionsTable: { destroy: () => void } | null = null;
  const globalWindow = window as unknown as Record<string, unknown>;

  AdminCommon.init();

  async function loadSubscriptions() {
    try {
      const subscriptions = (await api.getSubscriptions()) as Array<Record<string, unknown>>;
      const tbody = document.querySelector('#subscriptionsTable tbody');

      if (subscriptionsTable) {
        subscriptionsTable.destroy();
      }

      if (tbody && subscriptions && subscriptions.length > 0) {
        const statusColors: Record<string, string> = {
          ACTIVE: 'success',
          PENDING: 'warning',
          EXPIRED: 'danger',
          CANCELLED: 'secondary',
        };
        tbody.innerHTML = subscriptions
          .map(
            (s) => `
          <tr>
            <td>${s.id}</td>
            <td>${s.user ? (s.user as Record<string, unknown>).email : `User #${s.userId}`}</td>
            <td><span class="badge badge-warning">${s.tier}</span></td>
            <td><span class="badge badge-${statusColors[String(s.status)] || 'secondary'}">${s.status}</span></td>
            <td>${s.currentPeriodStart ? AdminCommon.formatDateOnly(String(s.currentPeriodStart)) : 'N/A'}</td>
            <td>${s.currentPeriodEnd ? AdminCommon.formatDateOnly(String(s.currentPeriodEnd)) : 'N/A'}</td>
            <td>
              ${s.status === 'ACTIVE' ? `<button class="btn btn-sm btn-danger" onclick="cancelSubscription(${s.userId})"><i class="fas fa-times"></i> Cancel</button>` : ''}
            </td>
          </tr>
        `,
          )
          .join('');
        subscriptionsTable = AdminCommon.initDataTable(
          '#subscriptionsTable',
          {},
          'subscriptionsTable',
        );
      } else if (tbody) {
        tbody.innerHTML =
          '<tr><td colspan="7" class="text-center">No subscriptions found</td></tr>';
      }
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
      AdminCommon.showError(
        `Failed to load subscriptions: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  globalWindow.cancelSubscription = async (userId: number) => {
    if (confirm('Cancel this subscription?')) {
      try {
        await api.cancelSubscription(userId);
        AdminCommon.showSuccess('Subscription cancelled successfully');
        loadSubscriptions();
      } catch (error) {
        AdminCommon.showError(
          `Failed to cancel subscription: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }
    }
  };

  loadSubscriptions();

  return () => {
    if (subscriptionsTable) {
      subscriptionsTable.destroy();
      subscriptionsTable = null;
    }
    delete globalWindow.cancelSubscription;
  };
}

export default function SubscriptionsPage() {
  return <LegacyPage html={subscriptionsHtml} onMount={initSubscriptionsPage} />;
}
