'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createColumnHelper } from '@tanstack/react-table';
import { api } from '@/lib/api';
import { formatDateOnly, toastError } from '@/lib/utils';
import { webSocketManager } from '@/lib/websocket';
import { DataTable } from '@/components/data-table';
import { PageHeader } from '@/components/page-header';
import { PageLoading } from '@/components/loading';
import { Dialog } from '@/components/dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/button';
import { FormRow } from '@/components/form-fields';
import { useConfirmAction } from '@/hooks/use-confirm-action';
import type { Schedule } from '@/types';
import { CreateScheduleDialog } from './_components/create-schedule-dialog';
import { ScheduleDetailDialog } from './_components/schedule-detail-dialog';

const columnHelper = createColumnHelper<Schedule>();

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'inactive' | 'all'>('active');
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [generateTarget, setGenerateTarget] = useState<number | null>(null);
  const [generateDate, setGenerateDate] = useState(new Date().toISOString().split('T')[0]);
  const [showCreate, setShowCreate] = useState(false);
  const [detail, setDetail] = useState<Schedule | null>(null);
  const { confirmAction, confirm, reset } = useConfirmAction();

  const load = useCallback(async () => {
    try {
      let data = (await api.getSchedules()) as Schedule[];
      if (filter === 'active') data = data.filter((s) => s.isActive);
      else if (filter === 'inactive') data = data.filter((s) => !s.isActive);
      setSchedules(data);
    } catch (err) {
      toastError(err, 'Failed to load');
    } finally { setLoading(false); }
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

  const loadDetail = async (id: number) => {
    try {
      const s = (await api.getSchedule(id)) as Schedule;
      setDetail(s);
    } catch (err) {
      toastError(err);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteSchedule(deleteTarget);
      toast.success('Schedule deleted');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toastError(err);
    }
  };

  const handleGenerate = async () => {
    if (!generateTarget || !generateDate) return;
    try {
      // Append 'T00:00:00Z' so the plain date string is interpreted as UTC midnight,
      // not as the browser's local midnight (which varies by timezone).
      const utcDate = new Date(generateDate + 'T00:00:00Z').toISOString();
      const result = (await api.generateGamesForSchedule(generateTarget, utcDate)) as { gamesCreated?: number };
      toast.success(`Generated ${result.gamesCreated || 0} game(s) for ${generateDate}`);
      setGenerateTarget(null);
      load();
    } catch (err) {
      toastError(err);
    }
  };

  const handleCancelGames = (id: number) => {
    confirm({
      title: 'Cancel All CREATED Games',
      message: 'Cancel all CREATED games for this schedule? This cannot be undone.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.cancelScheduleGames(id);
          toast.success('Games cancelled');
          reset();
          if (detail?.id === id) loadDetail(id);
          load();
        } catch (err) {
          toastError(err);
          reset();
        }
      },
    });
  };

  const handleActivate = async (id: number) => {
    try {
      await api.activateSchedule(id);
      toast.success('Schedule activated');
      load();
    } catch (err) {
      toastError(err);
    }
  };

  const handleDetailMutated = (id: number) => {
    loadDetail(id);
    load();
  };

  const columns = [
    columnHelper.accessor('id', { header: 'ID' }),
    columnHelper.accessor('name', { header: 'Name' }),
    columnHelper.accessor('recurrenceType', {
      header: 'Type',
      cell: (i) => <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">{i.getValue()}</span>,
    }),
    columnHelper.accessor('isActive', {
      header: 'Status',
      cell: (i) => i.getValue()
        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700"><i className="fas fa-circle text-[8px]" /> Active</span>
        : <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-400">Inactive</span>,
    }),
    columnHelper.accessor('slotsPerGame', { header: 'Slots/Game' }),
    columnHelper.accessor('createdAt', { header: 'Created', cell: (i) => formatDateOnly(i.getValue()) }),
    columnHelper.display({
      id: 'actions', header: 'Actions',
      cell: (info) => {
        const s = info.row.original;
        return (
          <div className="flex gap-1">
            <Button variant="primary" size="xs" onClick={() => loadDetail(s.id)} title="View"><i className="fas fa-eye" /></Button>
            {!s.isActive && (
              <Button variant="success" size="xs" onClick={() => handleActivate(s.id)} title="Activate Schedule"><i className="fas fa-power-off" /></Button>
            )}
            <Button variant="success" size="xs" onClick={() => { setGenerateTarget(s.id); setGenerateDate(new Date().toISOString().split('T')[0]); }} title="Generate Games"><i className="fas fa-calendar-plus" /></Button>
            <Button variant="orange" size="xs" onClick={() => handleCancelGames(s.id)} title="Cancel Games"><i className="fas fa-ban" /></Button>
            <Button variant="danger" size="xs" onClick={() => setDeleteTarget(s.id)} title="Delete"><i className="fas fa-trash" /></Button>
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
          <div className="flex items-center gap-2">
            <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
              <option value="all">All Schedules</option>
            </select>
            <Button variant="primary" size="lg" onClick={() => setShowCreate(true)}>
              New Schedule
            </Button>
          </div>
        }
      />

      <div className="bg-white rounded-lg shadow p-6">
        <DataTable columns={columns} data={schedules} searchPlaceholder="Search schedules..." />
      </div>

      <CreateScheduleDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={load}
      />

      {detail && (
        <ScheduleDetailDialog
          schedule={detail}
          onClose={() => setDetail(null)}
          onMutated={handleDetailMutated}
        />
      )}

      <Dialog open={generateTarget !== null} onClose={() => setGenerateTarget(null)} title="Generate Games">
        <div className="space-y-4">
          <FormRow label="Date *"><input type="date" value={generateDate} onChange={(e) => setGenerateDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></FormRow>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
            This will cancel all dangling games for this schedule and generate new games for the selected date.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setGenerateTarget(null)}>Cancel</Button>
            <Button onClick={handleGenerate}>Generate</Button>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog open={deleteTarget !== null} title="Delete Schedule" message="Are you sure you want to delete this schedule?" confirmLabel="Delete" variant="danger" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      <ConfirmDialog open={confirmAction !== null} title={confirmAction?.title || ''} message={confirmAction?.message || ''} variant={confirmAction?.variant} onConfirm={() => confirmAction?.onConfirm()} onCancel={reset} />
    </div>
  );
}
