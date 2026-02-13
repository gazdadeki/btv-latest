'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createColumnHelper } from '@tanstack/react-table';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { DataTable } from '@/components/data-table';
import { PageHeader } from '@/components/page-header';
import { PageLoading } from '@/components/loading';
import { Dialog } from '@/components/dialog';
import { Tabs } from '@/components/tabs';

interface AuditLog {
  id: number;
  createdAt: string;
  userEmail?: string;
  userId?: number;
  action: string;
  entityType: string;
  entityId?: number;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  user?: { id: number; email: string; username?: string; role?: string };
}

const columnHelper = createColumnHelper<AuditLog>();

export default function AuditPage() {
  const [data, setData] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const [detailTab, setDetailTab] = useState('basic');

  const load = useCallback(async () => {
    try {
      const result = (await api.getAuditLogs()) as { data?: AuditLog[] } | AuditLog[];
      setData(Array.isArray(result) ? result : (result as { data?: AuditLog[] }).data || []);
    } catch (err) {
      toast.error(`Failed to load audit logs: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleViewDetail = async (log: AuditLog) => {
    try {
      const detail = (await api.getAuditLog(log.id)) as AuditLog;
      setSelected(detail);
      setDetailTab('basic');
    } catch {
      setSelected(log);
      setDetailTab('basic');
    }
  };

  const columns = [
    columnHelper.accessor('createdAt', {
      header: 'Time',
      cell: (info) => formatDate(info.getValue()),
    }),
    columnHelper.accessor('userEmail', {
      header: 'User',
      cell: (info) => info.getValue() || 'System',
    }),
    columnHelper.accessor('action', {
      header: 'Action',
      cell: (info) => (
        <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor(
      (row) => `${row.entityType}${row.entityId ? ` #${row.entityId}` : ''}`,
      { id: 'entity', header: 'Entity' },
    ),
    columnHelper.accessor('details', {
      header: 'Details',
      cell: (info) => {
        const d = info.getValue();
        return d ? (
          <span className="text-xs text-gray-500 truncate max-w-[200px] block">
            {JSON.stringify(d).substring(0, 50)}...
          </span>
        ) : '-';
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: (info) => (
        <button
          onClick={() => handleViewDetail(info.row.original)}
          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <i className="fas fa-eye" />
        </button>
      ),
    }),
  ];

  if (loading) return <PageLoading />;

  const tabs = [
    { id: 'basic', label: 'Basic' },
    { id: 'details', label: 'Details' },
    { id: 'metadata', label: 'Metadata' },
    ...(selected?.userId ? [{ id: 'user', label: 'Related User' }] : []),
  ];

  return (
    <div>
      <PageHeader title="Audit Logs" />
      <div className="bg-white rounded-lg shadow p-6">
        <DataTable columns={columns} data={data} searchPlaceholder="Search audit logs..." />
      </div>

      <Dialog
        open={selected !== null}
        onClose={() => setSelected(null)}
        title="Audit Log Details"
        className="max-w-2xl"
      >
        {selected && (
          <div>
            <Tabs tabs={tabs} activeTab={detailTab} onTabChange={setDetailTab} />

            {detailTab === 'basic' && (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  <tr><td className="py-2 font-medium w-1/3">ID</td><td>{selected.id}</td></tr>
                  <tr><td className="py-2 font-medium">Time</td><td>{formatDate(selected.createdAt)}</td></tr>
                  <tr><td className="py-2 font-medium">User</td><td>{selected.userEmail || 'System'}</td></tr>
                  <tr><td className="py-2 font-medium">Action</td><td>{selected.action}</td></tr>
                  <tr><td className="py-2 font-medium">Entity Type</td><td>{selected.entityType}</td></tr>
                  <tr><td className="py-2 font-medium">Entity ID</td><td>{selected.entityId ?? 'N/A'}</td></tr>
                </tbody>
              </table>
            )}

            {detailTab === 'details' && (
              <pre className="bg-gray-50 p-4 rounded text-xs overflow-auto max-h-96">
                {selected.details
                  ? JSON.stringify(selected.details, null, 2)
                  : 'No details available'}
              </pre>
            )}

            {detailTab === 'metadata' && (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  <tr><td className="py-2 font-medium w-1/3">IP Address</td><td>{selected.ipAddress || 'N/A'}</td></tr>
                  <tr><td className="py-2 font-medium">User Agent</td><td className="break-all">{selected.userAgent || 'N/A'}</td></tr>
                </tbody>
              </table>
            )}

            {detailTab === 'user' && selected.userId && (
              <div className="space-y-3">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-100">
                    <tr><td className="py-2 font-medium w-1/3">User ID</td><td>{selected.userId}</td></tr>
                    <tr><td className="py-2 font-medium">Email</td><td>{selected.user?.email || selected.userEmail || 'N/A'}</td></tr>
                    {selected.user?.username && (
                      <tr><td className="py-2 font-medium">Username</td><td>{selected.user.username}</td></tr>
                    )}
                    {selected.user?.role && (
                      <tr><td className="py-2 font-medium">Role</td><td>{selected.user.role}</td></tr>
                    )}
                  </tbody>
                </table>
                <a
                  href={`/admin/users?userId=${selected.userId}`}
                  className="inline-flex items-center gap-1 px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  <i className="fas fa-external-link-alt text-xs" />
                  View User Profile
                </a>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}
