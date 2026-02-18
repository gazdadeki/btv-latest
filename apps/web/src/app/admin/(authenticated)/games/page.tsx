'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { createColumnHelper } from '@tanstack/react-table';
import { api } from '@/lib/api';
import { formatDate, toastError } from '@/lib/utils';
import { webSocketManager } from '@/lib/websocket';
import { DataTable } from '@/components/data-table';
import { PageHeader } from '@/components/page-header';
import { PageLoading } from '@/components/loading';
import { Dialog } from '@/components/dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/button';
import { StatusBadge } from '@/components/status-badge';
import { useConfirmAction } from '@/hooks/use-confirm-action';
import { GAME_STATUS_COLORS } from '@/constants';
import type { Game } from '@/types';
import { CreateGameDialog } from './_components/create-game-dialog';
import { FinishGameDialog } from './_components/finish-game-dialog';
import { GameDetailDialog } from './_components/game-detail-dialog';

interface ScheduleOption { id: number; name: string }

const columnHelper = createColumnHelper<Game>();

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [schedules, setSchedules] = useState<ScheduleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSchedule, setFilterSchedule] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [detailGame, setDetailGame] = useState<Game | null>(null);
  const [finishGame, setFinishGame] = useState<Game | null>(null);
  const [nextGameData, setNextGameData] = useState<{ id: number } | null>(null);
  const { confirmAction, confirm, reset } = useConfirmAction();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

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
      toastError(err, 'Failed to load games');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterSchedule, filterStartDate, filterEndDate]);

  const loadSchedules = useCallback(async () => {
    try {
      const res = await api.getSchedules();
      setSchedules(Array.isArray(res) ? (res as ScheduleOption[]) : []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadSchedules(); }, [loadSchedules]);

  const loadGameDetail = async (id: number) => {
    try {
      const res = await api.getGame(id) as Game;
      setDetailGame(res);
    } catch (err) {
      toastError(err);
    }
  };

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

  const handleStart = (id: number) => {
    confirm({
      title: 'Start Game', message: 'Are you sure you want to start this game?',
      onConfirm: async () => {
        try {
          await api.startGame(id);
          toast.success('Game started');
          load();
          reset();
        } catch (err) { toastError(err); reset(); }
      },
    });
  };

  const handleCancel = (id: number) => {
    confirm({
      title: 'Cancel Game', message: 'Cancel this game? This will mark it as cancelled.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.cancelGame(id);
          toast.success('Game cancelled');
          load();
          reset();
        } catch (err) { toastError(err); reset(); }
      },
    });
  };

  const handleCancelAll = () => {
    confirm({
      title: 'Cancel All Active Games',
      message: 'Cancel all active games (CREATED and IN_PROGRESS)? This cannot be undone.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await api.cancelAllActiveGames();
          toast.success(`${res.cancelledCount} game(s) cancelled`);
          load();
          reset();
        } catch (err) { toastError(err); reset(); }
      },
    });
  };

  const openFinish = async (id: number) => {
    try {
      const game = await api.getGame(id) as Game;
      setFinishGame(game);
    } catch (err) {
      toastError(err);
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
      toastError(err);
    }
  };

  const handleDetailMutated = (gameId: number) => {
    loadGameDetail(gameId);
    load();
  };

  const columns = [
    columnHelper.accessor('id', { header: 'ID' }),
    columnHelper.accessor((r) => r.schedule?.name || `Schedule #${r.scheduleId}`, { id: 'schedule', header: 'Schedule' }),
    columnHelper.accessor('scheduledStartTime', { header: 'Start Time', cell: (i) => formatDate(i.getValue()) }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: (i) => <StatusBadge status={i.getValue()} colorMap={GAME_STATUS_COLORS} />,
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
            <Button variant="primary" size="xs" onClick={() => loadGameDetail(g.id)} title="View"><i className="fas fa-eye" /></Button>
            {g.status === 'CREATED' && (
              <Button variant="success" size="xs" onClick={() => handleStart(g.id)} title="Start"><i className="fas fa-play" /></Button>
            )}
            {g.status === 'IN_PROGRESS' && (
              <Button variant="orange" size="xs" onClick={() => openFinish(g.id)} title="Finish"><i className="fas fa-stop" /></Button>
            )}
            {canModify && (
              <Button variant="danger" size="xs" onClick={() => handleCancel(g.id)} title="Cancel"><i className="fas fa-times" /></Button>
            )}
          </div>
        );
      },
    }),
  ];

  if (loading) return <PageLoading />;

  return (
    <div>
      <PageHeader
        title="Games"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="danger" size="lg" onClick={handleCancelAll}>
              Cancel All Active
            </Button>
            <Button variant="primary" size="lg" onClick={() => setShowCreate(true)}>
              New Game
            </Button>
          </div>
        }
      />

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
          <Button
            variant="secondary"
            size="lg"
            onClick={() => { setFilterStatus(''); setFilterSchedule(''); setFilterStartDate(''); setFilterEndDate(''); }}
          >
            Clear
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <DataTable columns={columns} data={games} searchPlaceholder="Search games..." />
      </div>

      <CreateGameDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        schedules={schedules}
        onCreated={load}
      />

      {detailGame && (
        <GameDetailDialog
          game={detailGame}
          onClose={() => setDetailGame(null)}
          onMutated={handleDetailMutated}
        />
      )}

      <FinishGameDialog
        game={finishGame}
        onClose={() => setFinishGame(null)}
        onFinished={(nextGame) => {
          if (nextGame) setNextGameData(nextGame);
          load();
        }}
      />

      <Dialog open={nextGameData !== null} onClose={() => setNextGameData(null)} title="Next Game">
        <p className="text-sm text-gray-600 mb-4">Next game found! How would you like to proceed?</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setNextGameData(null)}>Start Manually</Button>
          <Button variant="success" onClick={handleStartNext}>Start Now</Button>
        </div>
      </Dialog>

      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction?.title || ''}
        message={confirmAction?.message || ''}
        variant={confirmAction?.variant}
        onConfirm={() => confirmAction?.onConfirm()}
        onCancel={reset}
      />
    </div>
  );
}
