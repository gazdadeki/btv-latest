'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createColumnHelper } from '@tanstack/react-table';
import { api } from '@/lib/api';
import { formatDateOnly, toastError } from '@/lib/utils';
import { DataTable } from '@/components/data-table';
import { PageHeader } from '@/components/page-header';
import { PageLoading } from '@/components/loading';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/button';
import { StatusBadge } from '@/components/status-badge';
import { SUBSCRIPTION_STATUS_COLORS } from '@/constants';
import type { Subscription } from '@/types';

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
      toastError(err, 'Failed to load subscriptions');
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
      toastError(err, 'Failed to cancel');
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
        <StatusBadge status={info.getValue()} colorMap={SUBSCRIPTION_STATUS_COLORS} fallback="bg-gray-100 text-gray-500" />
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
          <Button
            variant="danger"
            size="xs"
            onClick={() => setCancelTarget(info.row.original.userId)}
          >
            <i className="fas fa-times mr-1" />
            Cancel
          </Button>
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
