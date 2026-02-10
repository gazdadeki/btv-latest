'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createColumnHelper } from '@tanstack/react-table';
import { api } from '@/lib/api';
import { formatDate, formatDateOnly } from '@/lib/utils';
import { DataTable } from '@/components/data-table';
import { PageHeader } from '@/components/page-header';
import { PageLoading } from '@/components/loading';
import { ConfirmDialog } from '@/components/confirm-dialog';

interface Subscription {
  id: number;
  userId: number;
  user?: { email: string };
  tier: string;
  status: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  EXPIRED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

const columnHelper = createColumnHelper<Subscription>();

export default function SubscriptionsPage() {
  const [data, setData] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const subs = (await api.getSubscriptions()) as Subscription[];
      setData(Array.isArray(subs) ? subs : []);
    } catch (err) {
      toast.error(`Failed to load subscriptions: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCancel = async () => {
    if (!cancelTarget) return;
    try {
      await api.cancelSubscription(cancelTarget);
      toast.success('Subscription cancelled successfully');
      setCancelTarget(null);
      load();
    } catch (err) {
      toast.error(`Failed to cancel: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const columns = [
    columnHelper.accessor('id', { header: 'ID' }),
    columnHelper.accessor((row) => row.user?.email ?? `User #${row.userId}`, {
      id: 'user',
      header: 'User',
    }),
    columnHelper.accessor('tier', {
      header: 'Tier',
      cell: (info) => (
        <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: (info) => (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[info.getValue()] || 'bg-gray-100 text-gray-500'}`}>
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('currentPeriodStart', {
      header: 'Period Start',
      cell: (info) => formatDateOnly(info.getValue() || ''),
    }),
    columnHelper.accessor('currentPeriodEnd', {
      header: 'Period End',
      cell: (info) => formatDateOnly(info.getValue() || ''),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: (info) =>
        info.row.original.status === 'ACTIVE' ? (
          <button
            onClick={() => setCancelTarget(info.row.original.userId)}
            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
          >
            <i className="fas fa-times mr-1" />
            Cancel
          </button>
        ) : null,
    }),
  ];

  if (loading) return <PageLoading />;

  return (
    <div>
      <PageHeader title="Subscriptions" />
      <div className="bg-white rounded-lg shadow p-6">
        <DataTable columns={columns} data={data} searchPlaceholder="Search subscriptions..." />
      </div>
      <ConfirmDialog
        open={cancelTarget !== null}
        title="Cancel Subscription"
        message="Are you sure you want to cancel this subscription?"
        confirmLabel="Cancel Subscription"
        variant="danger"
        onConfirm={handleCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}
