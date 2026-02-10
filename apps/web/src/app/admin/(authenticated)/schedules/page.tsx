'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createColumnHelper } from '@tanstack/react-table';
import { api } from '@/lib/api';
import { formatDate, formatDateOnly } from '@/lib/utils';
import { webSocketManager } from '@/lib/websocket';
import { DataTable } from '@/components/data-table';
import { PageHeader } from '@/components/page-header';
import { PageLoading } from '@/components/loading';
import { Dialog } from '@/components/dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';

interface Schedule {
  id: number;
  name: string;
  description?: string;
  recurrenceType: string;
  isActive: boolean;
  slotsPerGame: number;
  createdAt: string;
  firstGameStartTime?: string;
  gamesPerDay?: number;
  reservationCost?: number;
  confirmationWindowMinutes?: number;
  refundPolicy?: string;
}

const columnHelper = createColumnHelper<Schedule>();

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'inactive' | 'all'>('active');
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [viewSchedule, setViewSchedule] = useState<Record<string, unknown> | null>(null);
  const [generateTarget, setGenerateTarget] = useState<number | null>(null);
  const [generateDate, setGenerateDate] = useState(new Date().toISOString().split('T')[0]);

  const load = useCallback(async () => {
    try {
      let data = (await api.getSchedules()) as Schedule[];
      if (filter === 'active') data = data.filter((s) => s.isActive);
      else if (filter === 'inactive') data = data.filter((s) => !s.isActive);
      setSchedules(data);
    } catch (err) {
      toast.error(`Failed to load: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsubs = [
      webSocketManager.on('schedule:created', () => load()),
      webSocketManager.on('schedule:updated', () => load()),
      webSocketManager.on('schedule:deleted', () => load()),
    ];
    return () => unsubs.forEach((u) => u());
  }, [load]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteSchedule(deleteTarget);
      toast.success('Schedule deleted');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleView = async (id: number) => {
    try {
      const s = (await api.getSchedule(id)) as Record<string, unknown>;
      setViewSchedule(s);
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleGenerate = async () => {
    if (!generateTarget || !generateDate) return;
    try {
      const result = (await api.generateGamesForSchedule(generateTarget, generateDate)) as { gamesCreated?: number };
      toast.success(`Generated ${result.gamesCreated || 0} game(s) for ${generateDate}`);
      setGenerateTarget(null);
      load();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const columns = [
    columnHelper.accessor('id', { header: 'ID' }),
    columnHelper.accessor('name', { header: 'Name' }),
    columnHelper.accessor('recurrenceType', {
      header: 'Type',
      cell: (i) => (
        <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">{i.getValue()}</span>
      ),
    }),
    columnHelper.accessor('isActive', {
      header: 'Active',
      cell: (i) => (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${i.getValue() ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {i.getValue() ? 'Yes' : 'No'}
        </span>
      ),
    }),
    columnHelper.accessor('slotsPerGame', { header: 'Slots/Game' }),
    columnHelper.accessor('createdAt', {
      header: 'Created',
      cell: (i) => formatDateOnly(i.getValue()),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: (info) => {
        const s = info.row.original;
        return (
          <div className="flex gap-1">
            <button onClick={() => handleView(s.id)} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"><i className="fas fa-eye" /></button>
            <button onClick={() => { setGenerateTarget(s.id); setGenerateDate(new Date().toISOString().split('T')[0]); }} className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"><i className="fas fa-calendar-plus" /></button>
            <button onClick={() => setDeleteTarget(s.id)} className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"><i className="fas fa-trash" /></button>
          </div>
        );
      },
    }),
  ];

  if (loading) return <PageLoading />;

  return (
    <div>
      <PageHeader
        title="Schedules"
        actions={
          <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
            <option value="all">All Schedules</option>
          </select>
        }
      />
      <div className="bg-white rounded-lg shadow p-6">
        <DataTable columns={columns} data={schedules} searchPlaceholder="Search schedules..." />
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Schedule"
        message="Are you sure you want to delete this schedule?"
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* View Schedule Dialog */}
      <Dialog open={viewSchedule !== null} onClose={() => setViewSchedule(null)} title="Schedule Details" className="max-w-2xl">
        {viewSchedule && (
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              <tr><td className="py-2 font-medium w-1/3">ID</td><td>{String(viewSchedule.id)}</td></tr>
              <tr><td className="py-2 font-medium">Name</td><td>{String(viewSchedule.name || 'N/A')}</td></tr>
              <tr><td className="py-2 font-medium">Description</td><td>{String(viewSchedule.description || 'N/A')}</td></tr>
              <tr><td className="py-2 font-medium">Recurrence</td><td>{String(viewSchedule.recurrenceType)}</td></tr>
              <tr><td className="py-2 font-medium">Start Time</td><td>{String(viewSchedule.firstGameStartTime || 'N/A')}</td></tr>
              <tr><td className="py-2 font-medium">Games/Day</td><td>{String(viewSchedule.gamesPerDay || 1)}</td></tr>
              <tr><td className="py-2 font-medium">Slots/Game</td><td>{String(viewSchedule.slotsPerGame)}</td></tr>
              <tr><td className="py-2 font-medium">Reservation Cost</td><td>{String(viewSchedule.reservationCost || 0)} coins</td></tr>
              <tr><td className="py-2 font-medium">Confirmation Window</td><td>{String(viewSchedule.confirmationWindowMinutes || 0)} min</td></tr>
              <tr><td className="py-2 font-medium">Active</td><td>{viewSchedule.isActive ? 'Yes' : 'No'}</td></tr>
              <tr><td className="py-2 font-medium">Created</td><td>{formatDate(String(viewSchedule.createdAt || ''))}</td></tr>
            </tbody>
          </table>
        )}
      </Dialog>

      {/* Generate Games Dialog */}
      <Dialog open={generateTarget !== null} onClose={() => setGenerateTarget(null)} title="Generate Games">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Date *</label>
            <input type="date" value={generateDate} onChange={(e) => setGenerateDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
            This will cancel all dangling games for this schedule and generate new games for the selected date.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setGenerateTarget(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
            <button onClick={handleGenerate} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Generate</button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
