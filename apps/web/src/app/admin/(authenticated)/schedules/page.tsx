'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Tabs } from '@/components/tabs';

/* ────── Types ────── */
interface SlotConfig {
  slotNumber: number; team: string;
  isGoldOnly?: boolean; coinsCost?: number | null;
  preAssignedUserId?: number | null;
}
interface Game {
  id: number; status: string; scheduledStartTime: string;
  slotsReserved?: number; totalSlots?: number;
}
interface Schedule {
  id: number; name: string; description?: string;
  recurrenceType: string; recurrenceDays?: number[] | null;
  recurrencePattern?: { month: number; day: number } | null;
  isActive: boolean; slotsPerGame: number;
  reservationCost: number; instantReservationCost?: number;
  confirmationWindowMinutes: number;
  refundPolicy: string; refundPercentage?: number;
  isExclusiveToGold: boolean;
  firstGameStartTime?: string; gamesPerDay: number;
  spacingAfterFinishMinutes?: number;
  teamAName: string; teamBName: string;
  reminderMinutesBefore?: number[];
  url?: string; createdAt: string;
  slotConfigs?: SlotConfig[];
  games?: Game[];
}

const RECURRENCE_TYPES = ['WEEKLY', 'MONTHLY', 'YEARLY', 'ONCE'] as const;
const REFUND_POLICIES = ['FULL', 'PARTIAL', 'NONE'] as const;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const STATUS_COLORS: Record<string, string> = {
  CREATED: 'bg-blue-100 text-blue-700', IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  FINISHED: 'bg-green-100 text-green-700', CANCELLED: 'bg-red-100 text-red-700',
};
const columnHelper = createColumnHelper<Schedule>();

function defaultCreate(): Record<string, unknown> {
  return {
    name: '', description: '', firstGameStartTime: '20:00',
    gamesPerDay: 1, spacingAfterFinishMinutes: 15,
    confirmationWindowMinutes: 30, reservationCost: 10,
    instantReservationCost: 0, slotsPerGame: 10,
    refundPolicy: 'FULL', refundPercentage: 0,
    url: '', reminderMinutes: '30,15', isExclusiveToGold: false,
    teamAName: 'Scourge', teamBName: 'Sentinel',
    recurrenceType: 'WEEKLY', recurrenceDays: [1, 2, 3, 4, 5],
    recurrenceMonth: 1, recurrenceDay: 1,
    onceDate: new Date().toISOString().split('T')[0],
  };
}

export default function SchedulesPage() {
  /* ─── State ─── */
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'inactive' | 'all'>('active');
  // Dialogs
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [generateTarget, setGenerateTarget] = useState<number | null>(null);
  const [generateDate, setGenerateDate] = useState(new Date().toISOString().split('T')[0]);
  // Create wizard
  const [showCreate, setShowCreate] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [createForm, setCreateForm] = useState<Record<string, unknown>>(defaultCreate());
  const [createSlots, setCreateSlots] = useState<SlotConfig[]>([]);
  // Detail / edit
  const [detail, setDetail] = useState<Schedule | null>(null);
  const [detailTab, setDetailTab] = useState('overview');
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});
  const [editSlots, setEditSlots] = useState<SlotConfig[]>([]);
  const [propagate, setPropagate] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    title: string; message: string; variant?: 'danger' | 'default'; onConfirm: () => void;
  } | null>(null);

  /* ─── Load ─── */
  const load = useCallback(async () => {
    try {
      let data = (await api.getSchedules()) as Schedule[];
      if (filter === 'active') data = data.filter((s) => s.isActive);
      else if (filter === 'inactive') data = data.filter((s) => !s.isActive);
      setSchedules(data);
    } catch (err) {
      toast.error(`Failed to load: ${err instanceof Error ? err.message : 'Unknown error'}`);
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

  /* ─── Load detail ─── */
  const loadDetail = async (id: number) => {
    try {
      const s = (await api.getSchedule(id)) as Schedule;
      setDetail(s);
      setEditMode(false);
      setPropagate(false);
      setDetailTab('overview');
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const enterEdit = () => {
    if (!detail) return;
    setEditForm({
      name: detail.name, description: detail.description || '',
      firstGameStartTime: detail.firstGameStartTime || '',
      gamesPerDay: detail.gamesPerDay, spacingAfterFinishMinutes: detail.spacingAfterFinishMinutes || 0,
      confirmationWindowMinutes: detail.confirmationWindowMinutes,
      reservationCost: detail.reservationCost,
      instantReservationCost: detail.instantReservationCost || 0,
      slotsPerGame: detail.slotsPerGame,
      refundPolicy: detail.refundPolicy, refundPercentage: detail.refundPercentage || 0,
      url: detail.url || '', isExclusiveToGold: detail.isExclusiveToGold,
      teamAName: detail.teamAName, teamBName: detail.teamBName,
      isActive: detail.isActive,
      reminderMinutes: (detail.reminderMinutesBefore || []).join(','),
      recurrenceType: detail.recurrenceType,
      recurrenceDays: detail.recurrenceDays || [],
    });
    setEditSlots(detail.slotConfigs || []);
    setEditMode(true);
  };

  /* ─── Create ─── */
  const slotsCount = Number(createForm.slotsPerGame) || 10;

  useEffect(() => {
    if (showCreate && createStep === 3) {
      const slots: SlotConfig[] = [];
      for (let i = 1; i <= slotsCount; i++) {
        const existing = createSlots.find((s) => s.slotNumber === i);
        slots.push(existing || {
          slotNumber: i, team: i <= slotsCount / 2 ? 'A' : 'B',
          isGoldOnly: i === 2 || i === 3, coinsCost: null,
          preAssignedUserId: i === 1 ? null : null,
        });
      }
      setCreateSlots(slots.slice(0, slotsCount));
    }
  }, [showCreate, createStep, slotsCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const recurrencePreview = useMemo(() => {
    const type = createForm.recurrenceType as string;
    const days = createForm.recurrenceDays as number[];
    if (type === 'WEEKLY' && days?.length > 0) return `${days.length} game day(s) per week`;
    if (type === 'MONTHLY') return 'Selected days each month';
    if (type === 'YEARLY') return 'Once per year';
    if (type === 'ONCE') return 'Single event';
    return '';
  }, [createForm.recurrenceType, createForm.recurrenceDays]);

  const handleCreate = async () => {
    const f = createForm;
    const reminders = String(f.reminderMinutes || '').split(',').map(Number).filter(Boolean);
    let recDays = f.recurrenceDays as number[];
    let recPattern = null;
    if (f.recurrenceType === 'YEARLY') {
      recPattern = { month: Number(f.recurrenceMonth), day: Number(f.recurrenceDay) };
      recDays = [];
    }
    if (f.recurrenceType === 'ONCE') {
      recDays = [];
    }
    try {
      await api.createSchedule({
        name: f.name || undefined,
        description: f.description || null,
        recurrenceType: f.recurrenceType,
        recurrenceDays: recDays.length > 0 ? recDays : null,
        recurrencePattern: recPattern,
        slotsPerGame: Number(f.slotsPerGame),
        reservationCost: Number(f.reservationCost),
        instantReservationCost: Number(f.instantReservationCost) || null,
        confirmationWindowMinutes: Number(f.confirmationWindowMinutes),
        refundPolicy: f.refundPolicy,
        refundPercentage: f.refundPolicy === 'PARTIAL' ? Number(f.refundPercentage) : null,
        isExclusiveToGold: !!f.isExclusiveToGold,
        firstGameStartTime: f.firstGameStartTime,
        gamesPerDay: Number(f.gamesPerDay),
        spacingAfterFinishMinutes: Number(f.spacingAfterFinishMinutes) || null,
        teamAName: f.teamAName || 'Scourge',
        teamBName: f.teamBName || 'Sentinel',
        reminderMinutesBefore: reminders.length ? reminders : null,
        url: f.url || null,
        slotConfigs: createSlots,
      });
      toast.success('Schedule created');
      setShowCreate(false);
      setCreateForm(defaultCreate());
      setCreateSlots([]);
      setCreateStep(1);
      load();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  /* ─── Save edit ─── */
  const handleSaveEdit = async () => {
    if (!detail) return;
    const f = editForm;
    const reminders = String(f.reminderMinutes || '').split(',').map(Number).filter(Boolean);
    try {
      await api.updateSchedule(detail.id, {
        name: f.name, description: f.description || null,
        firstGameStartTime: f.firstGameStartTime,
        gamesPerDay: Number(f.gamesPerDay),
        spacingAfterFinishMinutes: Number(f.spacingAfterFinishMinutes) || null,
        confirmationWindowMinutes: Number(f.confirmationWindowMinutes),
        reservationCost: Number(f.reservationCost),
        instantReservationCost: Number(f.instantReservationCost) || null,
        slotsPerGame: Number(f.slotsPerGame),
        refundPolicy: f.refundPolicy,
        refundPercentage: f.refundPolicy === 'PARTIAL' ? Number(f.refundPercentage) : null,
        isExclusiveToGold: !!f.isExclusiveToGold,
        teamAName: f.teamAName || 'Scourge',
        teamBName: f.teamBName || 'Sentinel',
        isActive: f.isActive as boolean,
        reminderMinutesBefore: reminders.length ? reminders : null,
        url: f.url || null,
        recurrenceType: f.recurrenceType as string,
        recurrenceDays: (f.recurrenceDays as number[])?.length > 0 ? f.recurrenceDays : null,
        slotConfigs: editSlots,
        propagateNow: propagate,
      });
      toast.success('Schedule updated');
      setEditMode(false);
      loadDetail(detail.id);
      load();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  /* ─── Other actions ─── */
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

  const handleCancelGames = (id: number) => {
    setConfirmAction({
      title: 'Cancel All CREATED Games',
      message: 'Cancel all CREATED games for this schedule? This cannot be undone.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.cancelScheduleGames(id);
          toast.success('Games cancelled');
          setConfirmAction(null);
          if (detail?.id === id) loadDetail(id);
          load();
        } catch (err) {
          toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
          setConfirmAction(null);
        }
      },
    });
  };

  /* ─── Columns ─── */
  const columns = [
    columnHelper.accessor('id', { header: 'ID' }),
    columnHelper.accessor('name', { header: 'Name' }),
    columnHelper.accessor('recurrenceType', {
      header: 'Type',
      cell: (i) => <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">{i.getValue()}</span>,
    }),
    columnHelper.accessor('isActive', {
      header: 'Active',
      cell: (i) => <span className={`px-2 py-0.5 rounded text-xs font-medium ${i.getValue() ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{i.getValue() ? 'Yes' : 'No'}</span>,
    }),
    columnHelper.accessor('slotsPerGame', { header: 'Slots/Game' }),
    columnHelper.accessor('createdAt', { header: 'Created', cell: (i) => formatDateOnly(i.getValue()) }),
    columnHelper.display({
      id: 'actions', header: 'Actions',
      cell: (info) => {
        const s = info.row.original;
        return (
          <div className="flex gap-1">
            <button onClick={() => loadDetail(s.id)} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700" title="View"><i className="fas fa-eye" /></button>
            <button onClick={() => { setGenerateTarget(s.id); setGenerateDate(new Date().toISOString().split('T')[0]); }} className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700" title="Generate Games"><i className="fas fa-calendar-plus" /></button>
            <button onClick={() => handleCancelGames(s.id)} className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700" title="Cancel Games"><i className="fas fa-ban" /></button>
            <button onClick={() => setDeleteTarget(s.id)} className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700" title="Delete"><i className="fas fa-trash" /></button>
          </div>
        );
      },
    }),
  ];

  if (loading) return <PageLoading />;

  /* ─── Helper: form row ─── */
  const fRow = (label: string, input: React.ReactNode) => (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {input}
    </div>
  );
  const fInput = (form: Record<string, unknown>, key: string, setForm: (v: Record<string, unknown>) => void, type = 'text', placeholder = '') => (
    <input
      type={type} value={String(form[key] ?? '')}
      onChange={(e) => setForm({ ...form, [key]: type === 'number' ? e.target.value : e.target.value })}
      placeholder={placeholder}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
    />
  );
  const fSelect = (form: Record<string, unknown>, key: string, setForm: (v: Record<string, unknown>) => void, opts: readonly string[]) => (
    <select value={String(form[key] || '')} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
      {opts.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
  const fCheck = (form: Record<string, unknown>, key: string, setForm: (v: Record<string, unknown>) => void, label: string) => (
    <label className="flex items-center gap-2 text-sm cursor-pointer">
      <input type="checkbox" checked={!!form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} className="rounded" />
      {label}
    </label>
  );

  /* ─── Recurrence form ─── */
  const recurrenceForm = (form: Record<string, unknown>, setForm: (v: Record<string, unknown>) => void) => {
    const type = form.recurrenceType as string;
    return (
      <div className="space-y-3">
        {fRow('Recurrence Type', fSelect(form, 'recurrenceType', setForm, RECURRENCE_TYPES))}
        {type === 'WEEKLY' && (
          <div>
            <label className="block text-sm font-medium mb-2">Days of Week</label>
            <div className="flex gap-2">
              {WEEKDAYS.map((d, i) => {
                const day = i + 1;
                const days = (form.recurrenceDays as number[]) || [];
                const active = days.includes(day);
                return (
                  <button
                    key={d} type="button"
                    onClick={() => setForm({ ...form, recurrenceDays: active ? days.filter((x) => x !== day) : [...days, day].sort() })}
                    className={`px-3 py-1.5 text-xs rounded-full border cursor-pointer ${active ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 hover:bg-gray-50'}`}
                  >{d}</button>
                );
              })}
            </div>
          </div>
        )}
        {type === 'MONTHLY' && fRow('Days of Month (comma-separated)', fInput(form, 'recurrenceDays', (v) => setForm({ ...v, recurrenceDays: String(v.recurrenceDays).split(',').map(Number).filter(Boolean) }), 'text', 'e.g. 1,15'))}
        {type === 'YEARLY' && (
          <div className="grid grid-cols-2 gap-3">
            {fRow('Month (1-12)', fInput(form, 'recurrenceMonth', setForm, 'number'))}
            {fRow('Day (1-31)', fInput(form, 'recurrenceDay', setForm, 'number'))}
          </div>
        )}
        {type === 'ONCE' && fRow('Date', <input type="date" value={String(form.onceDate || '')} onChange={(e) => setForm({ ...form, onceDate: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />)}
      </div>
    );
  };

  /* ─── Slot config form ─── */
  const slotConfigForm = (slots: SlotConfig[], setSlots: (s: SlotConfig[]) => void) => {
    const teamA = slots.filter((s) => s.team === 'A').sort((a, b) => a.slotNumber - b.slotNumber);
    const teamB = slots.filter((s) => s.team === 'B').sort((a, b) => a.slotNumber - b.slotNumber);
    const renderTeam = (team: SlotConfig[], teamLabel: string) => (
      <div>
        <h4 className="font-medium text-sm mb-2">{teamLabel}</h4>
        <div className="space-y-2">
          {team.map((s) => (
            <div key={s.slotNumber} className="flex items-center gap-2 text-xs p-2 bg-gray-50 rounded">
              <span className="font-mono w-8">#{s.slotNumber}</span>
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={!!s.isGoldOnly} onChange={(e) => setSlots(slots.map((sl) => sl.slotNumber === s.slotNumber ? { ...sl, isGoldOnly: e.target.checked } : sl))} className="rounded" />
                Gold
              </label>
              <input
                type="number" placeholder="Cost override"
                value={s.coinsCost ?? ''} min={0}
                onChange={(e) => setSlots(slots.map((sl) => sl.slotNumber === s.slotNumber ? { ...sl, coinsCost: e.target.value ? Number(e.target.value) : null } : sl))}
                className="w-24 border border-gray-300 rounded px-2 py-1"
              />
              <input
                type="number" placeholder="Pre-assign ID"
                value={s.preAssignedUserId ?? ''} min={1}
                onChange={(e) => setSlots(slots.map((sl) => sl.slotNumber === s.slotNumber ? { ...sl, preAssignedUserId: e.target.value ? Number(e.target.value) : null } : sl))}
                className="w-28 border border-gray-300 rounded px-2 py-1"
              />
            </div>
          ))}
        </div>
      </div>
    );
    return (
      <div className="grid grid-cols-2 gap-4">
        {renderTeam(teamA, 'Team A (Scourge)')}
        {renderTeam(teamB, 'Team B (Sentinel)')}
      </div>
    );
  };

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
            <button onClick={() => { setShowCreate(true); setCreateForm(defaultCreate()); setCreateStep(1); }} className="px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              New Schedule
            </button>
          </div>
        }
      />

      <div className="bg-white rounded-lg shadow p-6">
        <DataTable columns={columns} data={schedules} searchPlaceholder="Search schedules..." />
      </div>

      {/* ═══ Create Schedule Wizard ═══ */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)} title={`Create Schedule - Step ${createStep} of 3`} className="max-w-2xl">
        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`flex-1 h-1.5 rounded ${s <= createStep ? 'bg-indigo-600' : 'bg-gray-200'}`} />
          ))}
        </div>

        {/* Step 1: Config */}
        {createStep === 1 && (
          <div className="space-y-3">
            {fRow('Name (optional)', fInput(createForm, 'name', setCreateForm, 'text', 'Auto-generated if empty'))}
            {fRow('Description', fInput(createForm, 'description', setCreateForm))}
            <div className="grid grid-cols-2 gap-3">
              {fRow('First Game Start Time', <input type="time" value={String(createForm.firstGameStartTime || '')} onChange={(e) => setCreateForm({ ...createForm, firstGameStartTime: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />)}
              {fRow('Games Per Day', fInput(createForm, 'gamesPerDay', setCreateForm, 'number'))}
              {fRow('Spacing (min)', fInput(createForm, 'spacingAfterFinishMinutes', setCreateForm, 'number'))}
              {fRow('Confirm Window (min)', fInput(createForm, 'confirmationWindowMinutes', setCreateForm, 'number'))}
              {fRow('Reservation Cost', fInput(createForm, 'reservationCost', setCreateForm, 'number'))}
              {fRow('Instant Reserve Cost', fInput(createForm, 'instantReservationCost', setCreateForm, 'number'))}
              {fRow('Slots Per Game', fInput(createForm, 'slotsPerGame', setCreateForm, 'number'))}
              {fRow('Refund Policy', fSelect(createForm, 'refundPolicy', setCreateForm, REFUND_POLICIES))}
            </div>
            {createForm.refundPolicy === 'PARTIAL' && fRow('Refund %', fInput(createForm, 'refundPercentage', setCreateForm, 'number'))}
            {fRow('URL', fInput(createForm, 'url', setCreateForm, 'url', 'https://youtube.com'))}
            {fRow('Reminder Minutes', fInput(createForm, 'reminderMinutes', setCreateForm, 'text', '30,15'))}
            {fCheck(createForm, 'isExclusiveToGold', setCreateForm, 'Exclusive to Gold Subscribers')}
            <div className="flex justify-end pt-2">
              <button onClick={() => setCreateStep(2)} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Next: Recurrence</button>
            </div>
          </div>
        )}

        {/* Step 2: Recurrence */}
        {createStep === 2 && (
          <div className="space-y-4">
            {recurrenceForm(createForm, setCreateForm)}
            {recurrencePreview && (
              <div className="p-3 bg-indigo-50 text-indigo-800 rounded text-sm">{recurrencePreview}</div>
            )}
            <div className="flex justify-between pt-2">
              <button onClick={() => setCreateStep(1)} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Back</button>
              <button onClick={() => setCreateStep(3)} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Next: Slots</button>
            </div>
          </div>
        )}

        {/* Step 3: Slots */}
        {createStep === 3 && (
          <div className="space-y-4">
            {slotConfigForm(createSlots, setCreateSlots)}
            <div className="flex justify-between pt-2">
              <button onClick={() => setCreateStep(2)} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Back</button>
              <button onClick={handleCreate} className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700">Create Schedule</button>
            </div>
          </div>
        )}
      </Dialog>

      {/* ═══ Schedule Detail Dialog (4 Tabs) ═══ */}
      <Dialog open={detail !== null} onClose={() => setDetail(null)} title="Schedule Details" className="max-w-4xl">
        {detail && (
          <>
            <div className="flex items-center justify-between mb-2">
              <Tabs
                tabs={[
                  { id: 'overview', label: 'Overview' },
                  { id: 'recurrence', label: 'Recurrence' },
                  { id: 'slots', label: 'Slots' },
                  { id: 'games', label: 'Games' },
                ]}
                activeTab={detailTab}
                onTabChange={setDetailTab}
              />
              {!editMode && (
                <button onClick={enterEdit} className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 mb-4 shrink-0 ml-4">Edit</button>
              )}
            </div>

            {/* Overview */}
            {detailTab === 'overview' && !editMode && (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  <tr><td className="py-2 font-medium w-1/3">ID</td><td>{detail.id}</td></tr>
                  <tr><td className="py-2 font-medium">Name</td><td>{detail.name}</td></tr>
                  <tr><td className="py-2 font-medium">Description</td><td>{detail.description || 'N/A'}</td></tr>
                  <tr><td className="py-2 font-medium">Active</td><td>{detail.isActive ? 'Yes' : 'No'}</td></tr>
                  <tr><td className="py-2 font-medium">Start Time</td><td>{detail.firstGameStartTime || 'N/A'}</td></tr>
                  <tr><td className="py-2 font-medium">Games/Day</td><td>{detail.gamesPerDay}</td></tr>
                  <tr><td className="py-2 font-medium">Slots/Game</td><td>{detail.slotsPerGame}</td></tr>
                  <tr><td className="py-2 font-medium">Reservation Cost</td><td>{detail.reservationCost} coins</td></tr>
                  <tr><td className="py-2 font-medium">Instant Reserve Cost</td><td>{detail.instantReservationCost || 0} coins</td></tr>
                  <tr><td className="py-2 font-medium">Confirm Window</td><td>{detail.confirmationWindowMinutes} min</td></tr>
                  <tr><td className="py-2 font-medium">Refund Policy</td><td>{detail.refundPolicy}{detail.refundPercentage ? ` (${detail.refundPercentage}%)` : ''}</td></tr>
                  <tr><td className="py-2 font-medium">Exclusive to Gold</td><td>{detail.isExclusiveToGold ? 'Yes' : 'No'}</td></tr>
                  <tr><td className="py-2 font-medium">URL</td><td>{detail.url || 'N/A'}</td></tr>
                  <tr><td className="py-2 font-medium">Created</td><td>{formatDate(detail.createdAt)}</td></tr>
                </tbody>
              </table>
            )}
            {detailTab === 'overview' && editMode && (
              <div className="space-y-3">
                {fRow('Name', fInput(editForm, 'name', setEditForm))}
                {fRow('Description', fInput(editForm, 'description', setEditForm))}
                <div className="grid grid-cols-2 gap-3">
                  {fRow('Start Time', <input type="time" value={String(editForm.firstGameStartTime || '')} onChange={(e) => setEditForm({ ...editForm, firstGameStartTime: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />)}
                  {fRow('Games/Day', fInput(editForm, 'gamesPerDay', setEditForm, 'number'))}
                  {fRow('Spacing (min)', fInput(editForm, 'spacingAfterFinishMinutes', setEditForm, 'number'))}
                  {fRow('Confirm Window', fInput(editForm, 'confirmationWindowMinutes', setEditForm, 'number'))}
                  {fRow('Reserve Cost', fInput(editForm, 'reservationCost', setEditForm, 'number'))}
                  {fRow('Instant Cost', fInput(editForm, 'instantReservationCost', setEditForm, 'number'))}
                  {fRow('Slots/Game', fInput(editForm, 'slotsPerGame', setEditForm, 'number'))}
                  {fRow('Refund Policy', fSelect(editForm, 'refundPolicy', setEditForm, REFUND_POLICIES))}
                </div>
                {editForm.refundPolicy === 'PARTIAL' && fRow('Refund %', fInput(editForm, 'refundPercentage', setEditForm, 'number'))}
                {fRow('URL', fInput(editForm, 'url', setEditForm, 'url'))}
                {fRow('Reminder Minutes', fInput(editForm, 'reminderMinutes', setEditForm, 'text', '30,15'))}
                {fCheck(editForm, 'isExclusiveToGold', setEditForm, 'Exclusive to Gold')}
                {fCheck(editForm, 'isActive', setEditForm, 'Active')}
                <div className="border-t border-gray-200 pt-3 mt-3">
                  {fCheck({ propagate }, 'propagate', (v) => setPropagate(!!v.propagate), 'Propagate changes now (cancel CREATED games and regenerate)')}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setEditMode(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                  <button onClick={handleSaveEdit} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Save</button>
                </div>
              </div>
            )}

            {/* Recurrence */}
            {detailTab === 'recurrence' && !editMode && (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  <tr><td className="py-2 font-medium w-1/3">Type</td><td>{detail.recurrenceType}</td></tr>
                  <tr>
                    <td className="py-2 font-medium">Days</td>
                    <td>
                      {detail.recurrenceType === 'WEEKLY' && detail.recurrenceDays
                        ? detail.recurrenceDays.map((d) => WEEKDAYS[d - 1]).join(', ')
                        : detail.recurrenceType === 'YEARLY' && detail.recurrencePattern
                          ? `Month ${detail.recurrencePattern.month}, Day ${detail.recurrencePattern.day}`
                          : detail.recurrenceDays?.join(', ') || 'N/A'
                      }
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
            {detailTab === 'recurrence' && editMode && (
              <div className="space-y-3">
                {recurrenceForm(editForm, setEditForm)}
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setEditMode(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                  <button onClick={handleSaveEdit} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Save</button>
                </div>
              </div>
            )}

            {/* Slots */}
            {detailTab === 'slots' && !editMode && (
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left">#</th>
                      <th className="px-3 py-2 text-left">Team</th>
                      <th className="px-3 py-2 text-left">Gold Only</th>
                      <th className="px-3 py-2 text-left">Cost Override</th>
                      <th className="px-3 py-2 text-left">Pre-assigned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(detail.slotConfigs || []).sort((a, b) => a.slotNumber - b.slotNumber).map((s) => (
                      <tr key={s.slotNumber}>
                        <td className="px-3 py-2">{s.slotNumber}</td>
                        <td className="px-3 py-2">{s.team === 'A' ? 'Scourge' : 'Sentinel'}</td>
                        <td className="px-3 py-2">{s.isGoldOnly ? 'Yes' : 'No'}</td>
                        <td className="px-3 py-2">{s.coinsCost ?? 'Default'}</td>
                        <td className="px-3 py-2">{s.preAssignedUserId || 'None'}</td>
                      </tr>
                    ))}
                    {(!detail.slotConfigs || detail.slotConfigs.length === 0) && (
                      <tr><td colSpan={5} className="px-3 py-4 text-center text-gray-400">No slot configs</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            {detailTab === 'slots' && editMode && (
              <div className="space-y-3">
                {slotConfigForm(editSlots, setEditSlots)}
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setEditMode(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                  <button onClick={handleSaveEdit} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Save</button>
                </div>
              </div>
            )}

            {/* Games */}
            {detailTab === 'games' && (
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left">ID</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Start Time</th>
                      <th className="px-3 py-2 text-left">Slots</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(detail.games || []).map((g) => (
                      <tr key={g.id}>
                        <td className="px-3 py-2">{g.id}</td>
                        <td className="px-3 py-2">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[g.status] || 'bg-gray-100'}`}>{g.status}</span>
                        </td>
                        <td className="px-3 py-2">{formatDate(g.scheduledStartTime)}</td>
                        <td className="px-3 py-2">{g.slotsReserved || 0}/{g.totalSlots || '?'}</td>
                      </tr>
                    ))}
                    {(!detail.games || detail.games.length === 0) && (
                      <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-400">No games</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </Dialog>

      {/* ═══ Generate Games ═══ */}
      <Dialog open={generateTarget !== null} onClose={() => setGenerateTarget(null)} title="Generate Games">
        <div className="space-y-4">
          {fRow('Date *', <input type="date" value={generateDate} onChange={(e) => setGenerateDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />)}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
            This will cancel all dangling games for this schedule and generate new games for the selected date.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setGenerateTarget(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
            <button onClick={handleGenerate} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Generate</button>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog open={deleteTarget !== null} title="Delete Schedule" message="Are you sure you want to delete this schedule?" confirmLabel="Delete" variant="danger" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      <ConfirmDialog open={confirmAction !== null} title={confirmAction?.title || ''} message={confirmAction?.message || ''} variant={confirmAction?.variant} onConfirm={() => confirmAction?.onConfirm()} onCancel={() => setConfirmAction(null)} />
    </div>
  );
}
