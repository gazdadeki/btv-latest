import React from 'react';
import LegacyPage from '@/components/LegacyPage';
import { api } from '@/lib/api';
import { AdminCommon } from '@/lib/adminCommon';
import { webSocketManager } from '@/lib/websocketManager';

interface DashboardData {
  activeSchedules?: number;
  upcomingGames?: number;
  totalUsers?: number;
  verifiedUsers?: number;
  bannedUsers?: number;
  totalCoins?: number;
  activeSubscriptions?: number;
  onlineUsers?: number;
  pendingSubscriptions?: number;
  expiredSubscriptions?: number;
}

type ChartInstance = {
  data: unknown;
  update: () => void;
};

type ChartConstructor = new (
  ctx: HTMLCanvasElement,
  config: Record<string, unknown>,
) => ChartInstance;

let userStatsChart: ChartInstance | null = null;
let subscriptionChart: ChartInstance | null = null;

const dashboardHtml = `
  <div class="content-wrapper">
    <div class="content-header">
      <div class="container-fluid">
        <div class="row mb-2">
          <div class="col-sm-6">
            <h1 class="m-0">Dashboard</h1>
          </div>
        </div>
      </div>
    </div>
    <section class="content">
      <div class="container-fluid">
        <div class="row">
          <div class="col-12 col-sm-6 col-md-3">
            <div class="info-box">
              <span class="info-box-icon bg-info elevation-1"><i class="fas fa-calendar-alt"></i></span>
              <div class="info-box-content">
                <span class="info-box-text">Active Schedules</span>
                <span class="info-box-number" id="activeSchedules">0</span>
              </div>
            </div>
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <div class="info-box mb-3">
              <span class="info-box-icon bg-danger elevation-1"><i class="fas fa-calendar-check"></i></span>
              <div class="info-box-content">
                <span class="info-box-text">Upcoming Games</span>
                <span class="info-box-number" id="upcomingGames">0</span>
              </div>
            </div>
          </div>
          <div class="clearfix hidden-md-up"></div>
          <div class="col-12 col-sm-6 col-md-3">
            <div class="info-box mb-3">
              <span class="info-box-icon bg-success elevation-1"><i class="fas fa-users"></i></span>
              <div class="info-box-content">
                <span class="info-box-text">Total Users</span>
                <span class="info-box-number" id="totalUsers">0</span>
              </div>
            </div>
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <div class="info-box mb-3">
              <span class="info-box-icon bg-warning elevation-1"><i class="fas fa-crown"></i></span>
              <div class="info-box-content">
                <span class="info-box-text">Active Subscriptions</span>
                <span class="info-box-number" id="activeSubscriptions">0</span>
              </div>
            </div>
          </div>
        </div>

        <div class="row">
          <div class="col-12 col-sm-6 col-md-3">
            <div class="info-box">
              <span class="info-box-icon bg-primary elevation-1"><i class="fas fa-check-circle"></i></span>
              <div class="info-box-content">
                <span class="info-box-text">Verified Users</span>
                <span class="info-box-number" id="verifiedUsers">0</span>
              </div>
            </div>
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <div class="info-box mb-3">
              <span class="info-box-icon bg-danger elevation-1"><i class="fas fa-ban"></i></span>
              <div class="info-box-content">
                <span class="info-box-text">Banned Users</span>
                <span class="info-box-number" id="bannedUsers">0</span>
              </div>
            </div>
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <div class="info-box mb-3">
              <span class="info-box-icon bg-success elevation-1"><i class="fas fa-coins"></i></span>
              <div class="info-box-content">
                <span class="info-box-text">Total Coins</span>
                <span class="info-box-number" id="totalCoins">0</span>
              </div>
            </div>
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <div class="info-box mb-3">
              <span class="info-box-icon bg-info elevation-1"><i class="fas fa-user-check"></i></span>
              <div class="info-box-content">
                <span class="info-box-text">Online Users</span>
                <span class="info-box-number" id="onlineUsers">0</span>
              </div>
            </div>
          </div>
        </div>

        <div class="row">
          <div class="col-md-12">
            <div class="card">
              <div class="card-header">
                <h3 class="card-title">
                  <i class="fas fa-clock"></i> Cron Scheduler Status
                </h3>
                <div class="card-tools">
                  <button type="button" class="btn btn-tool" onclick="loadSchedulerStatus()">
                    <i class="fas fa-sync"></i>
                  </button>
                </div>
              </div>
              <div class="card-body">
                <div class="row">
                  <div class="col-md-3">
                    <strong>Last Execution:</strong><br />
                    <span id="schedulerLastExecution">Never</span>
                  </div>
                  <div class="col-md-3">
                    <strong>Status:</strong><br />
                    <span id="schedulerStatus" class="badge badge-secondary">Unknown</span>
                  </div>
                  <div class="col-md-3">
                    <strong>Execution Count:</strong><br />
                    <span id="schedulerExecutionCount">0</span>
                  </div>
                  <div class="col-md-3">
                    <strong>Error:</strong><br />
                    <span id="schedulerError" class="text-danger">None</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="row">
          <div class="col-md-6">
            <div class="card">
              <div class="card-header border-transparent">
                <h3 class="card-title">User Statistics</h3>
              </div>
              <div class="card-body">
                <canvas id="userStatsChart" style="min-height: 250px; height: 250px; max-height: 250px; max-width: 100%;"></canvas>
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="card">
              <div class="card-header border-transparent">
                <h3 class="card-title">Subscription Status</h3>
              </div>
              <div class="card-body">
                <canvas id="subscriptionChart" style="min-height: 250px; height: 250px; max-height: 250px; max-width: 100%;"></canvas>
              </div>
            </div>
          </div>
        </div>

        <div class="row">
          <div class="col-12">
            <div class="card">
              <div class="card-header">
                <h3 class="card-title">Recent Activity</h3>
              </div>
              <div class="card-body p-0">
                <table class="table table-striped">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Action</th>
                      <th>User</th>
                      <th>Entity</th>
                    </tr>
                  </thead>
                  <tbody id="recentActivity">
                    <tr>
                      <td colspan="4" class="text-center">Loading...</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>

  <footer class="main-footer">
    <strong>Copyright &copy; 2025 BaltazarTV.</strong>
    All rights reserved.
  </footer>
`;

function getChartConstructor(): ChartConstructor | null {
  if (!window.Chart) {
    return null;
  }
  return window.Chart as ChartConstructor;
}

function updateInfoBoxes(data: DashboardData) {
  const updates: Record<string, string | number> = {
    activeSchedules: data.activeSchedules || 0,
    upcomingGames: data.upcomingGames || 0,
    totalUsers: data.totalUsers || 0,
    verifiedUsers: data.verifiedUsers || 0,
    bannedUsers: data.bannedUsers || 0,
    totalCoins: (data.totalCoins || 0).toLocaleString(),
    activeSubscriptions: data.activeSubscriptions || 0,
    onlineUsers: data.onlineUsers || 0,
  };

  Object.keys(updates).forEach((key) => {
    const element = document.getElementById(key);
    if (element) {
      element.textContent = String(updates[key]);
    }
  });
}

function createUserStatsChart(data: DashboardData) {
  const ctx = document.getElementById('userStatsChart') as HTMLCanvasElement | null;
  if (!ctx) return;

  const ChartConstructor = getChartConstructor();
  if (!ChartConstructor) return;

  const chartData = {
    labels: ['Verified', 'Unverified', 'Banned'],
    datasets: [
      {
        data: [
          data.verifiedUsers || 0,
          (data.totalUsers || 0) -
            (data.verifiedUsers || 0) -
            (data.bannedUsers || 0),
          data.bannedUsers || 0,
        ],
        backgroundColor: ['#28a745', '#ffc107', '#dc3545'],
      },
    ],
  };

  if (userStatsChart) {
    userStatsChart.data = chartData;
    userStatsChart.update();
  } else {
    userStatsChart = new ChartConstructor(ctx, {
      type: 'doughnut',
      data: chartData,
      options: {
        maintainAspectRatio: false,
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
          },
        },
      },
    });
  }
}

function createSubscriptionChart(data: DashboardData) {
  const ctx = document.getElementById('subscriptionChart') as HTMLCanvasElement | null;
  if (!ctx) return;

  const ChartConstructor = getChartConstructor();
  if (!ChartConstructor) return;

  const chartData = {
    labels: ['Active', 'Pending', 'Expired'],
    datasets: [
      {
        label: 'Subscriptions',
        data: [
          data.activeSubscriptions || 0,
          data.pendingSubscriptions || 0,
          data.expiredSubscriptions || 0,
        ],
        backgroundColor: ['#28a745', '#ffc107', '#dc3545'],
      },
    ],
  };

  if (subscriptionChart) {
    subscriptionChart.data = chartData;
    subscriptionChart.update();
  } else {
    subscriptionChart = new ChartConstructor(ctx, {
      type: 'bar',
      data: chartData,
      options: {
        maintainAspectRatio: false,
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });
  }
}

async function loadRecentActivity() {
  const tbody = document.getElementById('recentActivity');
  const activityContainer =
    document.querySelector('#recentActivity')?.closest('.card-body') ||
    document.querySelector('#recentActivity')?.parentElement;

  if (!tbody || !activityContainer) return;

  try {
    AdminCommon.showContainerLoader(activityContainer, 'Loading recent activity...');
    const logs = (await api.getAuditLogs({ page: 1, limit: 10 })) as {
      data?: Array<{ createdAt: string; action: string; userEmail?: string; entityType: string; entityId?: number }>;
    };

    if (logs.data && logs.data.length > 0) {
      tbody.innerHTML = logs.data
        .map(
          (log) => `
        <tr>
          <td>${AdminCommon.formatDate(log.createdAt)}</td>
          <td><span class="badge badge-info">${log.action}</span></td>
          <td>${log.userEmail || 'System'}</td>
          <td>${log.entityType}${log.entityId ? ' #' + log.entityId : ''}</td>
        </tr>
      `,
        )
        .join('');
    } else {
      tbody.innerHTML =
        '<tr><td colspan="4" class="text-center">No recent activity</td></tr>';
    }
  } catch (error) {
    console.error('Failed to load recent activity:', error);
    tbody.innerHTML =
      '<tr><td colspan="4" class="text-center text-danger">Failed to load activity</td></tr>';
  } finally {
    AdminCommon.hideContainerLoader(activityContainer);
  }
}

async function loadDashboard() {
  try {
    const data = (await api.getDashboard()) as DashboardData;
    updateInfoBoxes(data);
    createUserStatsChart(data);
    createSubscriptionChart(data);
    await loadRecentActivity();
  } catch (error) {
    console.error('Failed to load dashboard:', error);
    AdminCommon.showError(
      `Failed to load dashboard data: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    );
  }
}

async function loadSchedulerStatus() {
  try {
    const status = (await api.getSchedulerStatus()) as {
      lastExecutionTime?: string;
      lastExecutionStatus?: string;
      executionCount?: number;
      lastExecutionError?: string;
    };

    const lastExecutionEl = document.getElementById('schedulerLastExecution');
    if (lastExecutionEl) {
      if (status.lastExecutionTime) {
        lastExecutionEl.textContent = AdminCommon.formatDate(status.lastExecutionTime);
      } else {
        lastExecutionEl.textContent = 'Never';
      }
    }

    const statusEl = document.getElementById('schedulerStatus');
    if (statusEl) {
      statusEl.textContent = status.lastExecutionStatus || 'Unknown';
      statusEl.className =
        'badge badge-' +
        (status.lastExecutionStatus === 'success'
          ? 'success'
          : status.lastExecutionStatus === 'error'
            ? 'danger'
            : 'secondary');
    }

    const countEl = document.getElementById('schedulerExecutionCount');
    if (countEl) {
      countEl.textContent = String(status.executionCount || 0);
    }

    const errorEl = document.getElementById('schedulerError');
    if (errorEl) {
      if (status.lastExecutionError) {
        errorEl.textContent = status.lastExecutionError;
        errorEl.className = 'text-danger';
      } else {
        errorEl.textContent = 'None';
        errorEl.className = 'text-success';
      }
    }
  } catch (error) {
    console.error('Failed to load scheduler status:', error);
    const statusEl = document.getElementById('schedulerStatus');
    if (statusEl) {
      statusEl.textContent = 'Error';
      statusEl.className = 'badge badge-danger';
    }
  }
}

function initializeWebSocket() {
  const unsubscribers = [
    webSocketManager.on('game:created', () => loadDashboard()),
    webSocketManager.on('game:updated', () => loadDashboard()),
    webSocketManager.on('game:status_changed', () => loadDashboard()),
    webSocketManager.on('user:activity_changed', (data) => {
      const payload = data as { state?: string };
      if (payload.state === 'ONLINE' || payload.state === 'OFFLINE') {
        loadDashboard();
      }
    }),
    webSocketManager.on('reservation:created', () => loadDashboard()),
    webSocketManager.on('reservation:confirmed', () => loadDashboard()),
    webSocketManager.on('reservation:cancelled', () => loadDashboard()),
  ];

  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
}

function initDashboardPage() {
  AdminCommon.init();
  AdminCommon.showFullScreenLoader('Loading dashboard...');
  loadDashboard().finally(() => {
    AdminCommon.hideFullScreenLoader();
  });
  loadSchedulerStatus();

  const cleanupWebSocket = initializeWebSocket();
  window.loadSchedulerStatus = loadSchedulerStatus;

  return () => {
    cleanupWebSocket();
    delete (window as { loadSchedulerStatus?: () => void }).loadSchedulerStatus;
  };
}

export default function DashboardPage() {
  return <LegacyPage html={dashboardHtml} onMount={initDashboardPage} />;
}
