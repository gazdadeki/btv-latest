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
}

const columnHelper = createColumnHelper<AuditLog>();

export default function AuditPage() {
  const [data, setData] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const [detailTab, setDetailTab] = useState<'basic' | 'details' | 'metadata'>('basic');

  const load = useCallback(async () => {
    try {
      const result = (await api.getAuditLogs()) as { data?: AuditLog[] };
      setData(result.data || []);
    } catch (err) {
      toast.error(`Failed to load audit logs: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
        ) : (
          '-'
        );
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: (info) => (
        <button
          onClick={() => {
            setSelected(info.row.original);
            setDetailTab('basic');
          }}
          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <i className="fas fa-eye" />
        </button>
      ),
    }),
  ];

  if (loading) return <PageLoading />;

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
            <div className="flex gap-2 mb-4 border-b border-gray-200 pb-2">
              {(['basic', 'details', 'metadata'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDetailTab(tab)}
                  className={`px-3 py-1 text-sm rounded ${detailTab === tab ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

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
          </div>
        )}
      </Dialog>
    </div>
  );
}
