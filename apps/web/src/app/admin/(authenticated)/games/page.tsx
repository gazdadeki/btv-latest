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

interface Game {
  id: number;
  scheduleId: number;
  scheduleName?: string;
  schedule?: { name: string };
  scheduledStartTime: string;
  status: string;
  slotsReserved?: number;
  totalSlots?: number;
  teamAName?: string;
  teamBName?: string;
  winningTeam?: string;
}

const statusColors: Record<string, string> = {
  CREATED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  FINISHED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const columnHelper = createColumnHelper<Game>();

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [viewGame, setViewGame] = useState<Game | null>(null);

  const load = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (filterStatus) params.status = filterStatus;
      const res = await api.getGames(params);
      const list = Array.isArray(res) ? res : (res as { data?: Game[] }).data || [];
      setGames(list as Game[]);
    } catch (err) {
      toast.error(`Failed to load games: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async (id: number) => {
    try {
      await api.cancelGame(id);
      toast.success('Game cancelled');
      load();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const columns = [
    columnHelper.accessor('id', { header: 'ID' }),
    columnHelper.accessor((row) => row.schedule?.name || row.scheduleName || `Schedule #${row.scheduleId}`, {
      id: 'schedule',
      header: 'Schedule',
    }),
    columnHelper.accessor('scheduledStartTime', {
      header: 'Start Time',
      cell: (i) => formatDate(i.getValue()),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: (i) => (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[i.getValue()] || 'bg-gray-100 text-gray-500'}`}>
          {i.getValue()}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'slots',
      header: 'Slots',
      cell: (info) => {
        const g = info.row.original;
        return `${g.slotsReserved || 0}/${g.totalSlots || '?'}`;
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: (info) => {
        const g = info.row.original;
        return (
          <div className="flex gap-1">
            <button onClick={() => setViewGame(g)} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"><i className="fas fa-eye" /></button>
            {(g.status === 'CREATED' || g.status === 'IN_PROGRESS') && (
              <button onClick={() => handleCancel(g.id)} className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"><i className="fas fa-times" /></button>
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
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">All Statuses</option>
            <option value="CREATED">Created</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="FINISHED">Finished</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        }
      />
      <div className="bg-white rounded-lg shadow p-6">
        <DataTable columns={columns} data={games} searchPlaceholder="Search games..." />
      </div>

      <Dialog open={viewGame !== null} onClose={() => setViewGame(null)} title="Game Details" className="max-w-2xl">
        {viewGame && (
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              <tr><td className="py-2 font-medium w-1/3">ID</td><td>{viewGame.id}</td></tr>
              <tr><td className="py-2 font-medium">Schedule</td><td>{viewGame.schedule?.name || `#${viewGame.scheduleId}`}</td></tr>
              <tr><td className="py-2 font-medium">Start Time</td><td>{formatDate(viewGame.scheduledStartTime)}</td></tr>
              <tr><td className="py-2 font-medium">Status</td><td>{viewGame.status}</td></tr>
              <tr><td className="py-2 font-medium">Team A</td><td>{viewGame.teamAName || 'Scourge'}</td></tr>
              <tr><td className="py-2 font-medium">Team B</td><td>{viewGame.teamBName || 'Sentinel'}</td></tr>
              {viewGame.winningTeam && (
                <tr><td className="py-2 font-medium">Winner</td><td>{viewGame.winningTeam === 'A' ? (viewGame.teamAName || 'Scourge') : (viewGame.teamBName || 'Sentinel')}</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Dialog>
    </div>
  );
}
