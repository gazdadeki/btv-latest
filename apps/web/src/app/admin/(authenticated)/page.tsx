"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";
import { api } from "@/lib/api";
import { webSocketManager } from "@/lib/websocket";
import { formatDate, toastError } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { PageLoading } from "@/components/loading";
import { Button } from "@/components/button";
import { StartStreamDialog } from "@/components/start-stream-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { DashboardData, SchedulerStatus, AuditLog, Stream } from "@/types";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
);

const STREAM_STATUS_STYLES: Record<
  string,
  { bg: string; dot: string; label: string }
> = {
  PENDING: {
    bg: "bg-yellow-50 border-yellow-200",
    dot: "bg-yellow-500",
    label: "Stream Ready",
  },
  LIVE: {
    bg: "bg-green-50 border-green-200",
    dot: "bg-green-500 animate-pulse",
    label: "LIVE",
  },
};

function StreamWidget() {
  const [stream, setStream] = useState<Stream | null | undefined>(undefined);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.getActiveStream();
      setStream((res as Stream) || null);
    } catch {
      setStream(null);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const events = [
      "games:batch_changed",
      "game:created",
      "game:status_changed",
      "stream:changed",
    ];
    const unsubs = events.map((e) => webSocketManager.on(e, load));
    return () => unsubs.forEach((u) => u());
  }, [load]);

  const handleEnd = async () => {
    if (!stream) return;
    setLoading(true);
    try {
      await api.endStream(stream.id);
      toast.success("Stream ended");
      setShowEndConfirm(false);
      await load();
      webSocketManager.emitLocal("stream:changed");
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  // Loading or no stream — show minimal card
  if (stream === undefined) return null;

  if (!stream) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <i className="fas fa-broadcast-tower text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">
                Today&apos;s Stream
              </p>
              <p className="text-sm text-gray-400">No active stream</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const style = STREAM_STATUS_STYLES[stream.status];
  const gameCount = stream.games?.length ?? 0;

  return (
    <div
      className={`rounded-lg shadow border p-4 mb-6 ${style?.bg ?? "bg-white border-gray-200"}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/80 flex items-center justify-center">
            <i className="fas fa-broadcast-tower text-indigo-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-block w-2 h-2 rounded-full ${style?.dot ?? "bg-gray-400"}`}
              />
              <span className="text-sm font-semibold">
                {style?.label ?? stream.status}
              </span>
              {stream.title && (
                <span className="text-sm text-gray-600">· {stream.title}</span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {stream.schedule?.name || `Schedule #${stream.scheduleId}`}
              {" · "}
              {gameCount} game{gameCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {stream.status === "PENDING" && (
            <Button
              variant="success"
              size="sm"
              onClick={() => setShowStartDialog(true)}
            >
              <i className="fas fa-play mr-1.5" />
              Start Stream
            </Button>
          )}
          {stream.status === "LIVE" && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowEndConfirm(true)}
              disabled={loading}
            >
              <i className="fas fa-stop mr-1.5" />
              End Stream
            </Button>
          )}
        </div>
      </div>
      {stream.status === "PENDING" && (
        <StartStreamDialog
          open={showStartDialog}
          stream={stream}
          onClose={() => setShowStartDialog(false)}
          onStarted={() => {
            setShowStartDialog(false);
            load();
            webSocketManager.emitLocal("stream:changed");
          }}
        />
      )}
      {stream.status === "LIVE" && (
        <ConfirmDialog
          open={showEndConfirm}
          title="End Stream"
          message="Are you sure you want to end this stream? This action cannot be undone."
          confirmLabel="End Stream"
          variant="danger"
          onConfirm={handleEnd}
          onCancel={() => setShowEndConfirm(false)}
        />
      )}
    </div>
  );
}

function StatCard({
  icon,
  iconBg,
  label,
  value,
}: {
  icon: string;
  iconBg: string;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-4 flex items-center gap-4">
      <div
        className={`w-12 h-12 rounded-lg flex items-center justify-center ${iconBg}`}
      >
        <i className={`${icon} text-white text-lg`} />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}

function UserStatsChart({ data }: { data: DashboardData }) {
  const chartData = useMemo(() => {
    const verified = data.verifiedUsers || 0;
    const banned = data.bannedUsers || 0;
    const total = data.totalUsers || 0;
    const unverified = Math.max(0, total - verified - banned);
    return {
      labels: ["Verified", "Unverified", "Banned"],
      datasets: [
        {
          data: [verified, unverified, banned],
          backgroundColor: ["#28a745", "#ffc107", "#dc3545"],
        },
      ],
    };
  }, [data]);

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold">
          <i className="fas fa-users mr-2" />
          User Statistics
        </h3>
      </div>
      <div
        className="p-4 flex items-center justify-center"
        style={{ height: 280 }}
      >
        <Doughnut
          data={chartData}
          options={{
            maintainAspectRatio: false,
            responsive: true,
            plugins: { legend: { position: "bottom" } },
          }}
        />
      </div>
    </div>
  );
}

function SubscriptionChart({ data }: { data: DashboardData }) {
  const chartData = useMemo(
    () => ({
      labels: ["Active", "Pending", "Expired"],
      datasets: [
        {
          label: "Subscriptions",
          data: [
            data.activeSubscriptions || 0,
            data.pendingSubscriptions || 0,
            data.expiredSubscriptions || 0,
          ],
          backgroundColor: ["#28a745", "#ffc107", "#dc3545"],
        },
      ],
    }),
    [data],
  );

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold">
          <i className="fas fa-credit-card mr-2" />
          Subscriptions
        </h3>
      </div>
      <div className="p-4" style={{ height: 280 }}>
        <Bar
          data={chartData}
          options={{
            maintainAspectRatio: false,
            responsive: true,
            scales: { y: { beginAtZero: true } },
          }}
        />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({});
  const [scheduler, setScheduler] = useState<SchedulerStatus>({});
  const [activity, setActivity] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      const stats = (await api.getDashboardStats()) as DashboardData;
      setData(stats);
    } catch (err) {
      toastError(err, "Failed to load dashboard");
    }
  }, []);

  const loadScheduler = useCallback(async () => {
    try {
      const status = (await api.getSchedulerStatus()) as SchedulerStatus;
      setScheduler(status);
    } catch {
      // Ignore
    }
  }, []);

  const loadActivity = useCallback(async () => {
    try {
      const logs = (await api.getAuditLogs({ page: "1", limit: "10" })) as {
        data?: AuditLog[];
      };
      setActivity(logs.data || []);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    Promise.all([loadDashboard(), loadScheduler(), loadActivity()]).finally(
      () => setLoading(false),
    );
  }, [loadDashboard, loadScheduler, loadActivity]);

  useEffect(() => {
    const unsubs = [
      webSocketManager.on("game:created", () => loadDashboard()),
      webSocketManager.on("game:updated", () => loadDashboard()),
      webSocketManager.on("game:status_changed", () => loadDashboard()),
      webSocketManager.on("user:activity_changed", () => loadDashboard()),
      webSocketManager.on("reservation:created", () => loadDashboard()),
      webSocketManager.on("reservation:confirmed", () => loadDashboard()),
      webSocketManager.on("reservation:cancelled", () => loadDashboard()),
    ];
    return () => unsubs.forEach((u) => u());
  }, [loadDashboard]);

  if (loading) return <PageLoading />;

  return (
    <div>
      <PageHeader title="Dashboard" />

      <StreamWidget />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon="fas fa-calendar-alt"
          iconBg="bg-blue-500"
          label="Active Schedules"
          value={data.activeSchedules || 0}
        />
        <StatCard
          icon="fas fa-calendar-check"
          iconBg="bg-red-500"
          label="Upcoming Games"
          value={data.upcomingGames || 0}
        />
        <StatCard
          icon="fas fa-users"
          iconBg="bg-green-500"
          label="Total Users"
          value={data.totalUsers || 0}
        />
        <StatCard
          icon="fas fa-crown"
          iconBg="bg-yellow-500"
          label="Active Subscriptions"
          value={data.activeSubscriptions || 0}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon="fas fa-check-circle"
          iconBg="bg-indigo-500"
          label="Verified Users"
          value={data.verifiedUsers || 0}
        />
        <StatCard
          icon="fas fa-ban"
          iconBg="bg-red-500"
          label="Banned Users"
          value={data.bannedUsers || 0}
        />
        <StatCard
          icon="fas fa-coins"
          iconBg="bg-green-500"
          label="Total Coins"
          value={(data.totalCoins || 0).toLocaleString()}
        />
        <StatCard
          icon="fas fa-user-check"
          iconBg="bg-blue-500"
          label="Online Users"
          value={data.onlineUsers || 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <UserStatsChart data={data} />
        <SubscriptionChart data={data} />
      </div>

      <div className="bg-white rounded-lg shadow mb-6">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="font-semibold">
            <i className="fas fa-clock mr-2" />
            Cron Scheduler Status
          </h3>
          <Button variant="ghost" size="sm" onClick={loadScheduler}>
            <i className="fas fa-sync" />
          </Button>
        </div>
        <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="font-medium text-gray-500">Last Execution</p>
            <p>
              {scheduler.lastExecutionTime
                ? formatDate(scheduler.lastExecutionTime)
                : "Never"}
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-500">Status</p>
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${scheduler.lastExecutionStatus === "success" ? "bg-green-100 text-green-700" : scheduler.lastExecutionStatus === "error" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"}`}
            >
              {scheduler.lastExecutionStatus || "Unknown"}
            </span>
          </div>
          <div>
            <p className="font-medium text-gray-500">Execution Count</p>
            <p>{scheduler.executionCount || 0}</p>
          </div>
          <div>
            <p className="font-medium text-gray-500">Error</p>
            <p
              className={
                scheduler.lastExecutionError ? "text-red-600" : "text-green-600"
              }
            >
              {scheduler.lastExecutionError || "None"}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold">Recent Activity</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Time
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Action
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  User
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Entity
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activity.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    No recent activity
                  </td>
                </tr>
              ) : (
                activity.map((log, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{formatDate(log.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">{log.userEmail || "System"}</td>
                    <td className="px-4 py-3">
                      {log.entityType}
                      {log.entityId ? ` #${log.entityId}` : ""}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
