'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { createColumnHelper } from '@tanstack/react-table';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { webSocketManager } from '@/lib/websocket';
import { DataTable } from '@/components/data-table';
import { PageHeader } from '@/components/page-header';
import { PageLoading } from '@/components/loading';
import { Dialog } from '@/components/dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Tabs } from '@/components/tabs';
import { UserSearchDialog } from '@/components/user-search-dialog';

/* ────── Types ────── */
interface Schedule { id: number; name: string }
interface Slot {
  id: number; slotNumber: number; team: string;
  isReserved: boolean; reservedByUserId: number | null;
  isPreAssigned: boolean; preAssignedUserId: number | null;
  reservedByUser?: { email: string };
}
interface Reservation {
  id: number; slotId: number; userId: number; gameId: number;
  status: string; reservedAt: string; confirmedAt: string | null;
  user?: { email: string }; slot?: { slotNumber: number };
}
interface Game {
  id: number; scheduleId: number; schedule?: { name: string };
  scheduledStartTime: string; actualStartTime?: string;
  actualEndTime?: string; durationMinutes?: number;
  status: string; teamAName: string; teamBName: string;
  isExclusiveToGold: boolean; winningTeam?: string;
  mvpUserId?: number; url?: string;
  createdAt?: string; updatedAt?: string;
  slotsReserved?: number; totalSlots?: number;
  slots?: Slot[]; reservations?: Reservation[];
}

const STATUS_COLORS: Record<string, string> = {
  CREATED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  FINISHED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};
const RESERVATION_COLORS: Record<string, string> = {
  RESERVED: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-gray-100 text-gray-600',
};
const teamDisplay = (t: string) => (t === 'A' ? 'Scourge' : 'Sentinel');
const columnHelper = createColumnHelper<Game>();

export default function GamesPage() {
  /* ─── State ─── */
  const [games, setGames] = useState<Game[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSchedule, setFilterSchedule] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  // Dialogs
  const [showCreate, setShowCreate] = useState(false);
  const [detailGame, setDetailGame] = useState<Game | null>(null);
  const [detailTab, setDetailTab] = useState('info');
  const [finishGame, setFinishGame] = useState<Game | null>(null);
  const [nextGameData, setNextGameData] = useState<{ id: number } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string; message: string; variant?: 'danger' | 'default';
    onConfirm: () => void;
  } | null>(null);
  // Slot assignment
  const [slotAssign, setSlotAssign] = useState<{ gameId: number; slotId: number } | null>(null);
  const [reReserve, setReReserve] = useState<{
    gameId: number; slotId: number; userId: number; email: string; status: string;
  } | null>(null);
  // Create form
  const [createData, setCreateData] = useState({
    scheduleId: '', startTime: '', isExclusiveToGold: false,
  });
  // Finish form
  const [finishWinner, setFinishWinner] = useState('');
  const [finishUrl, setFinishUrl] = useState('');
  // Edit inline
  const [editUrl, setEditUrl] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editGold, setEditGold] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  /* ─── Load ─── */
  const load = useCallback(async () => {
    try {
      const params: Record<string, string | undefined> = {};
      if (filterStatus) params.status = filterStatus;
      if (filterSchedule) params.scheduleId = filterSchedule;
      if (filterStartDate) params.startDate = filterStartDate;
      if (filterEndDate) params.endDate = filterEndDate;
      const res = await api.getGames(params);
      const list = Array.isArray(res) ? res : (res as { data?: Game[] }).data || [];
      setGames(list as Game[]);
    } catch (err) {
      toast.error(`Failed to load games: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterSchedule, filterStartDate, filterEndDate]);

  const loadSchedules = useCallback(async () => {
    try {
      const res = await api.getSchedules();
      setSchedules(Array.isArray(res) ? (res as Schedule[]) : []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadSchedules(); }, [loadSchedules]);

  /* ─── WebSocket ─── */
  useEffect(() => {
    const debouncedRefresh = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => load(), 150);
    };
    const gameEvents = [
      'game:created', 'game:updated', 'game:status_changed',
      'game:first_started', 'game:started', 'game:last_started',
      'game:first_finished', 'game:finished', 'game:last_finished',
    ];
    const slotEvents = [
      'slot:availability_changed', 'reservation:created',
      'reservation:confirmed', 'reservation:cancelled',
      'game:players_shuffled',
    ];
    const unsubs: (() => void)[] = [];
    for (const e of gameEvents) unsubs.push(webSocketManager.on(e, debouncedRefresh));
    for (const e of slotEvents) {
      unsubs.push(webSocketManager.on(e, (...args: unknown[]) => {
        debouncedRefresh();
        const data = args[0] as { gameId?: number } | undefined;
        if (data?.gameId && detailGame?.id === data.gameId) {
          loadGameDetail(data.gameId);
        }
      }));
    }
    unsubs.push(webSocketManager.on('games:batch_changed', () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      load();
    }));
    return () => { unsubs.forEach((u) => u()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, detailGame?.id]);

  /* ─── Actions ─── */
  const loadGameDetail = async (id: number) => {
    try {
      const res = await api.getGame(id) as Game;
      setDetailGame(res);
      setEditUrl(res.url || '');
      setEditStartTime(res.scheduledStartTime ? new Date(res.scheduledStartTime).toISOString().slice(0, 16) : '');
      setEditGold(res.isExclusiveToGold);
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleCreate = async () => {
    if (!createData.scheduleId || !createData.startTime) {
      toast.error('Schedule and start time are required');
      return;
    }
    try {
      await api.createGame({
        scheduleId: parseInt(createData.scheduleId),
        scheduledStartTime: new Date(createData.startTime).toISOString(),
        teamAName: 'Scourge', teamBName: 'Sentinel',
        isExclusiveToGold: createData.isExclusiveToGold,
      });
      toast.success('Game created');
      setShowCreate(false);
      setCreateData({ scheduleId: '', startTime: '', isExclusiveToGold: false });
      load();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleStart = (id: number) => {
    setConfirmAction({
      title: 'Start Game', message: 'Are you sure you want to start this game?',
      onConfirm: async () => {
        try {
          await api.startGame(id);
          toast.success('Game started');
          load();
          setConfirmAction(null);
        } catch (err) {
          toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
          setConfirmAction(null);
        }
      },
    });
  };

  const handleCancel = (id: number) => {
    setConfirmAction({
      title: 'Cancel Game', message: 'Cancel this game? This will mark it as cancelled.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.cancelGame(id);
          toast.success('Game cancelled');
          load();
          setConfirmAction(null);
        } catch (err) {
          toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
          setConfirmAction(null);
        }
      },
    });
  };

  const handleCancelAll = () => {
    setConfirmAction({
      title: 'Cancel All Active Games',
      message: 'Cancel all active games (CREATED and IN_PROGRESS)? This cannot be undone.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await api.cancelAllActiveGames();
          toast.success(`${res.cancelledCount} game(s) cancelled`);
          load();
          setConfirmAction(null);
        } catch (err) {
          toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
          setConfirmAction(null);
        }
      },
    });
  };

  const openFinish = async (id: number) => {
    try {
      const game = await api.getGame(id) as Game;
      setFinishGame(game);
      setFinishWinner('');
      setFinishUrl(game.url || '');
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleFinish = async () => {
    if (!finishGame || !finishWinner) { toast.error('Select a winning team'); return; }
    try {
      if (finishUrl) await api.updateGame(finishGame.id, { url: finishUrl });
      const res = await api.finishGame(finishGame.id, { winningTeam: finishWinner }) as {
        nextGame?: { id: number }; isLastGame?: boolean;
      };
      toast.success('Game finished');
      setFinishGame(null);
      if (res.nextGame && !res.isLastGame) {
        setNextGameData(res.nextGame);
      }
      load();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleStartNext = async () => {
    if (!nextGameData) return;
    try {
      await api.startGame(nextGameData.id);
      toast.success('Next game started');
      setNextGameData(null);
      load();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const saveGameDetails = async () => {
    if (!detailGame) return;
    try {
      const data: Record<string, unknown> = { url: editUrl };
      if (detailGame.status === 'CREATED') {
        data.scheduledStartTime = new Date(editStartTime).toISOString();
        data.isExclusiveToGold = editGold;
      }
      await api.updateGame(detailGame.id, data);
      toast.success('Game updated');
      loadGameDetail(detailGame.id);
      load();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Slot actions
  const handleAssignUser = (user: { id: number; email: string }) => {
    if (!slotAssign) return;
    setConfirmAction({
      title: 'Assign User',
      message: `Assign ${user.email} (ID: ${user.id}) to this slot?`,
      onConfirm: async () => {
        try {
          await api.assignUserToSlot(slotAssign.gameId, slotAssign.slotId, user.id);
          toast.success('User assigned');
          setSlotAssign(null);
          setConfirmAction(null);
          loadGameDetail(slotAssign.gameId);
          load();
        } catch (err) {
          toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
          setConfirmAction(null);
        }
      },
    });
  };

  const handleKick = (gameId: number, slotId: number) => {
    setConfirmAction({
      title: 'Remove User', message: 'Remove user from this slot?', variant: 'danger',
      onConfirm: async () => {
        try {
          await api.kickUserFromSlot(gameId, slotId);
          toast.success('User removed');
          loadGameDetail(gameId);
          load();
          setConfirmAction(null);
        } catch (err) {
          toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
          setConfirmAction(null);
        }
      },
    });
  };

  const handleShuffle = (gameId: number) => {
    setConfirmAction({
      title: 'Shuffle Players',
      message: 'Shuffle players? This will randomly reassign non-admin players, excluding admin slots and gold-only slots.',
      onConfirm: async () => {
        try {
          await api.shufflePlayers(gameId);
          toast.success('Players shuffled');
          loadGameDetail(gameId);
          load();
          setConfirmAction(null);
        } catch (err) {
          toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
          setConfirmAction(null);
        }
      },
    });
  };

  const handleConfirmReservation = (gameId: number, slotId: number) => {
    setConfirmAction({
      title: 'Confirm Reservation',
      message: 'Confirm this reservation? This bypasses the confirmation window and costs.',
      onConfirm: async () => {
        try {
          await api.confirmSlotReservation(gameId, slotId);
          toast.success('Reservation confirmed');
          loadGameDetail(gameId);
          load();
          setConfirmAction(null);
        } catch (err) {
          toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
          setConfirmAction(null);
        }
      },
    });
  };

  const handleConfirmAll = (gameId: number) => {
    setConfirmAction({
      title: 'Confirm All', message: 'Confirm all reserved slots?',
      onConfirm: async () => {
        try {
          const res = await api.confirmAllSlots(gameId);
          toast.success(`${res.confirmedCount} reservation(s) confirmed`);
          loadGameDetail(gameId);
          load();
          setConfirmAction(null);
        } catch (err) {
          toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
          setConfirmAction(null);
        }
      },
    });
  };

  const handleCancelAllConfirmations = (gameId: number) => {
    setConfirmAction({
      title: 'Cancel All Confirmations', message: 'Cancel all confirmations?', variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await api.cancelAllConfirmations(gameId);
          toast.success(`${res.cancelledCount} confirmation(s) cancelled`);
          loadGameDetail(gameId);
          load();
          setConfirmAction(null);
        } catch (err) {
          toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
          setConfirmAction(null);
        }
      },
    });
  };

  const handleReReserveSame = async () => {
    if (!reReserve) return;
    try {
      await api.assignUserToSlot(reReserve.gameId, reReserve.slotId, reReserve.userId);
      toast.success('Slot re-reserved');
      setReReserve(null);
      loadGameDetail(reReserve.gameId);
      load();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleReReserveDifferent = () => {
    if (!reReserve) return;
    setSlotAssign({ gameId: reReserve.gameId, slotId: reReserve.slotId });
    setReReserve(null);
  };

  /* ─── Columns ─── */
  const columns = [
    columnHelper.accessor('id', { header: 'ID' }),
    columnHelper.accessor((r) => r.schedule?.name || `Schedule #${r.scheduleId}`, { id: 'schedule', header: 'Schedule' }),
    columnHelper.accessor('scheduledStartTime', { header: 'Start Time', cell: (i) => formatDate(i.getValue()) }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: (i) => (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[i.getValue()] || 'bg-gray-100'}`}>
          {i.getValue()}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'slots', header: 'Slots',
      cell: (i) => `${i.row.original.slotsReserved || 0}/${i.row.original.totalSlots || '?'}`,
    }),
    columnHelper.display({
      id: 'actions', header: 'Actions',
      cell: (i) => {
        const g = i.row.original;
        const canModify = g.status === 'CREATED' || g.status === 'IN_PROGRESS';
        return (
          <div className="flex gap-1">
            <button onClick={() => loadGameDetail(g.id)} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700" title="View"><i className="fas fa-eye" /></button>
            {g.status === 'CREATED' && (
              <button onClick={() => handleStart(g.id)} className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700" title="Start"><i className="fas fa-play" /></button>
            )}
            {g.status === 'IN_PROGRESS' && (
              <button onClick={() => openFinish(g.id)} className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700" title="Finish"><i className="fas fa-stop" /></button>
            )}
            {canModify && (
              <button onClick={() => handleCancel(g.id)} className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700" title="Cancel"><i className="fas fa-times" /></button>
            )}
          </div>
        );
      },
    }),
  ];

  if (loading) return <PageLoading />;

  const isModifiable = detailGame && detailGame.status !== 'FINISHED' && detailGame.status !== 'CANCELLED';
  const reservedCount = detailGame?.reservations?.filter((r) => r.status === 'RESERVED').length || 0;
  const confirmedCount = detailGame?.reservations?.filter((r) => r.status === 'CONFIRMED').length || 0;

  return (
    <div>
      <PageHeader
        title="Games"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={handleCancelAll} className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">
              Cancel All Active
            </button>
            <button onClick={() => setShowCreate(true)} className="px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              New Game
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Schedule</label>
            <select value={filterSchedule} onChange={(e) => setFilterSchedule(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">All Schedules</option>
              {schedules.map((s) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">All Statuses</option>
              <option value="CREATED">Created</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="FINISHED">Finished</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <button
            onClick={() => { setFilterStatus(''); setFilterSchedule(''); setFilterStartDate(''); setFilterEndDate(''); }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <DataTable columns={columns} data={games} searchPlaceholder="Search games..." />
      </div>

      {/* ═══ Create Game Dialog ═══ */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)} title="Create Game">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Schedule *</label>
            <select value={createData.scheduleId} onChange={(e) => setCreateData({ ...createData, scheduleId: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Select Schedule</option>
              {schedules.map((s) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Scheduled Start Time *</label>
            <input type="datetime-local" value={createData.startTime} onChange={(e) => setCreateData({ ...createData, startTime: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={createData.isExclusiveToGold} onChange={(e) => setCreateData({ ...createData, isExclusiveToGold: e.target.checked })} className="rounded" />
            Exclusive to Gold Subscribers
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
            <button onClick={handleCreate} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Create Game</button>
          </div>
        </div>
      </Dialog>

      {/* ═══ Game Details Dialog (3 Tabs) ═══ */}
      <Dialog open={detailGame !== null} onClose={() => setDetailGame(null)} title="Game Details" className="max-w-4xl">
        {detailGame && (
          <>
            <Tabs
              tabs={[
                { id: 'info', label: 'Game Info' },
                { id: 'slots', label: 'Slots Management' },
                { id: 'reservations', label: 'Reservations' },
              ]}
              activeTab={detailTab}
              onTabChange={setDetailTab}
            />

            {/* Tab: Game Info */}
            {detailTab === 'info' && (
              <div>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-100">
                    <tr><td className="py-2 font-medium w-1/3">ID</td><td>{detailGame.id}</td></tr>
                    <tr><td className="py-2 font-medium">Schedule</td><td>{detailGame.schedule?.name || `#${detailGame.scheduleId}`}</td></tr>
                    <tr>
                      <td className="py-2 font-medium">Status</td>
                      <td><span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[detailGame.status] || ''}`}>{detailGame.status}</span></td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium">Scheduled Start</td>
                      <td>
                        {detailGame.status === 'CREATED' ? (
                          <input type="datetime-local" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
                        ) : formatDate(detailGame.scheduledStartTime)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium">Exclusive to Gold</td>
                      <td>
                        {detailGame.status === 'CREATED' ? (
                          <input type="checkbox" checked={editGold} onChange={(e) => setEditGold(e.target.checked)} className="rounded" />
                        ) : detailGame.isExclusiveToGold ? 'Yes' : 'No'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium">URL</td>
                      <td>
                        <input type="url" value={editUrl} onChange={(e) => setEditUrl(e.target.value)} placeholder="https://youtube.com" className="border border-gray-300 rounded px-2 py-1 text-sm w-full" />
                      </td>
                    </tr>
                    <tr><td className="py-2 font-medium">Actual Start</td><td>{detailGame.actualStartTime ? formatDate(detailGame.actualStartTime) : 'N/A'}</td></tr>
                    <tr><td className="py-2 font-medium">Actual End</td><td>{detailGame.actualEndTime ? formatDate(detailGame.actualEndTime) : 'N/A'}</td></tr>
                    <tr><td className="py-2 font-medium">Duration</td><td>{detailGame.durationMinutes ? `${detailGame.durationMinutes} min` : 'N/A'}</td></tr>
                    {detailGame.winningTeam && (
                      <tr><td className="py-2 font-medium">Winner</td><td>{detailGame.winningTeam === 'A' ? detailGame.teamAName : detailGame.teamBName}</td></tr>
                    )}
                    <tr><td className="py-2 font-medium">Created</td><td>{detailGame.createdAt ? formatDate(detailGame.createdAt) : 'N/A'}</td></tr>
                    <tr><td className="py-2 font-medium">Updated</td><td>{detailGame.updatedAt ? formatDate(detailGame.updatedAt) : 'N/A'}</td></tr>
                  </tbody>
                </table>
                <div className="flex justify-end mt-4">
                  <button onClick={saveGameDetails} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {/* Tab: Slots Management */}
            {detailTab === 'slots' && (
              <div>
                {isModifiable && (
                  <div className="mb-3">
                    <button onClick={() => handleShuffle(detailGame.id)} className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded hover:bg-purple-700">
                      Shuffle Players
                    </button>
                    <span className="text-xs text-gray-400 ml-2">Randomly reassign non-admin players</span>
                  </div>
                )}
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-3 py-2 text-left">Slot #</th>
                        <th className="px-3 py-2 text-left">Team</th>
                        <th className="px-3 py-2 text-left">Reserved</th>
                        <th className="px-3 py-2 text-left">Reserved By</th>
                        <th className="px-3 py-2 text-left">Pre-assigned</th>
                        <th className="px-3 py-2 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(detailGame.slots || []).sort((a, b) => a.slotNumber - b.slotNumber).map((slot) => (
                        <tr key={slot.id}>
                          <td className="px-3 py-2">{slot.slotNumber}</td>
                          <td className="px-3 py-2">{teamDisplay(slot.team)}</td>
                          <td className="px-3 py-2">
                            <span className={`px-1.5 py-0.5 rounded text-xs ${slot.isReserved ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                              {slot.isReserved ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="px-3 py-2">{slot.reservedByUser?.email || (slot.reservedByUserId ? `User #${slot.reservedByUserId}` : 'None')}</td>
                          <td className="px-3 py-2">
                            <span className={`px-1.5 py-0.5 rounded text-xs ${slot.isPreAssigned ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                              {slot.isPreAssigned ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1">
                              {!slot.isReserved && detailGame.status === 'CREATED' && (
                                <button onClick={() => setSlotAssign({ gameId: detailGame.id, slotId: slot.id })} className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700" title="Assign User">
                                  <i className="fas fa-user-plus" />
                                </button>
                              )}
                              {slot.isReserved && isModifiable && (
                                <button onClick={() => handleKick(detailGame.id, slot.id)} className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700" title="Kick User">
                                  <i className="fas fa-user-times" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {(!detailGame.slots || detailGame.slots.length === 0) && (
                        <tr><td colSpan={6} className="px-3 py-4 text-center text-gray-400">No slots</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab: Reservations */}
            {detailTab === 'reservations' && (
              <div>
                {isModifiable && (
                  <div className="mb-3 flex gap-2">
                    {reservedCount > 0 && (
                      <button onClick={() => handleConfirmAll(detailGame.id)} className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700">
                        Confirm All ({reservedCount})
                      </button>
                    )}
                    {confirmedCount > 0 && (
                      <button onClick={() => handleCancelAllConfirmations(detailGame.id)} className="px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700">
                        Cancel All Confirmations ({confirmedCount})
                      </button>
                    )}
                  </div>
                )}
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-3 py-2 text-left">ID</th>
                        <th className="px-3 py-2 text-left">User</th>
                        <th className="px-3 py-2 text-left">Slot</th>
                        <th className="px-3 py-2 text-left">Status</th>
                        <th className="px-3 py-2 text-left">Reserved At</th>
                        <th className="px-3 py-2 text-left">Confirmed At</th>
                        <th className="px-3 py-2 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(detailGame.reservations || []).map((r) => (
                        <tr key={r.id}>
                          <td className="px-3 py-2">{r.id}</td>
                          <td className="px-3 py-2">{r.user?.email || `User #${r.userId}`}</td>
                          <td className="px-3 py-2">{r.slot?.slotNumber || r.slotId}</td>
                          <td className="px-3 py-2">
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${RESERVATION_COLORS[r.status] || 'bg-gray-100'}`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="px-3 py-2">{formatDate(r.reservedAt)}</td>
                          <td className="px-3 py-2">{r.confirmedAt ? formatDate(r.confirmedAt) : 'N/A'}</td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1">
                              {r.status === 'RESERVED' && isModifiable && (
                                <button onClick={() => handleConfirmReservation(detailGame.id, r.slotId)} className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700" title="Confirm">
                                  <i className="fas fa-check" />
                                </button>
                              )}
                              {(r.status === 'EXPIRED' || r.status === 'CANCELLED') && isModifiable && (
                                <button
                                  onClick={() => setReReserve({
                                    gameId: detailGame.id, slotId: r.slotId, userId: r.userId,
                                    email: r.user?.email || `User #${r.userId}`, status: r.status,
                                  })}
                                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                  title="Re-reserve"
                                >
                                  <i className="fas fa-redo" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {(!detailGame.reservations || detailGame.reservations.length === 0) && (
                        <tr><td colSpan={7} className="px-3 py-4 text-center text-gray-400">No reservations</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </Dialog>

      {/* ═══ Finish Game Dialog ═══ */}
      <Dialog open={finishGame !== null} onClose={() => setFinishGame(null)} title="Finish Game">
        {finishGame && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Winning Team *</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="winner" value="A" checked={finishWinner === 'A'} onChange={() => setFinishWinner('A')} />
                  <span className="text-sm">{finishGame.teamAName || 'Scourge'}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="winner" value="B" checked={finishWinner === 'B'} onChange={() => setFinishWinner('B')} />
                  <span className="text-sm">{finishGame.teamBName || 'Sentinel'}</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Game URL</label>
              <input type="url" value={finishUrl} onChange={(e) => setFinishUrl(e.target.value)} placeholder="https://youtube.com" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              <p className="text-xs text-gray-400 mt-1">URL to include in finish notifications</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setFinishGame(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
              <button onClick={handleFinish} className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700">Finish Game</button>
            </div>
          </div>
        )}
      </Dialog>

      {/* ═══ Next Game Dialog ═══ */}
      <Dialog open={nextGameData !== null} onClose={() => setNextGameData(null)} title="Next Game">
        <p className="text-sm text-gray-600 mb-4">Next game found! How would you like to proceed?</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setNextGameData(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Start Manually</button>
          <button onClick={handleStartNext} className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700">Start Now</button>
        </div>
      </Dialog>

      {/* ═══ Re-reserve Dialog ═══ */}
      <Dialog open={reReserve !== null} onClose={() => setReReserve(null)} title="Re-reserve Slot">
        {reReserve && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Status:</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${RESERVATION_COLORS[reReserve.status] || ''}`}>{reReserve.status}</span>
            </div>
            <div className="text-sm"><span className="text-gray-500">Current user:</span> {reReserve.email}</div>
            <div className="flex gap-2">
              <button onClick={handleReReserveSame} className="flex-1 px-3 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Re-reserve for Same User</button>
              <button onClick={handleReReserveDifferent} className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Re-reserve for Different User</button>
            </div>
          </div>
        )}
      </Dialog>

      {/* ═══ User Search Dialog ═══ */}
      <UserSearchDialog
        open={slotAssign !== null}
        onClose={() => setSlotAssign(null)}
        onSelect={handleAssignUser}
        title="Assign User to Slot"
      />

      {/* ═══ Confirm Dialog ═══ */}
      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction?.title || ''}
        message={confirmAction?.message || ''}
        variant={confirmAction?.variant}
        onConfirm={() => confirmAction?.onConfirm()}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
