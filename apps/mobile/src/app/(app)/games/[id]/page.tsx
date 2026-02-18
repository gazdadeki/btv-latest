'use client';

// Translated from Mobile/lib/features/game/pages/game_details_page.dart
// Two tabs: Details and Slots. WebSocket join/leave event room on mount/unmount.
// Reserve, Confirm, Leave reservation flows with dialogs.

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Star, Info, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { wsManager } from '@/lib/websocket';
import { useAuth } from '@/lib/auth-context';
import { Loading } from '@/components/loading';
import { ErrorDisplay } from '@/components/error-display';
import { Button } from '@/components/button';
import { cn, formatDateTime, formatTime } from '@/lib/utils';
import {
  type Game, type Slot, type Team,
  GAME_STATUS_DISPLAY,
  TEAM_DISPLAY,
  availableSlotsCount,
  reservedSlotsCount,
  slotIsPending,
  slotIsConfirmed,
  reservationIsActive,
} from '@/types';

// ─── Confirm dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({
  title, message, confirmLabel, confirmVariant, onConfirm, onCancel,
}: {
  title: string; message: string; confirmLabel: string;
  confirmVariant?: 'primary' | 'danger' | 'success';
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white rounded-xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-5">{message}</p>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
          <Button variant={confirmVariant ?? 'primary'} size="sm" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Slot card ─────────────────────────────────────────────────────────────────
function SlotCard({
  slot, userId, hasActiveReservation,
  onReserve, onConfirm, onLeave,
}: {
  slot: Slot; userId?: number; hasActiveReservation: boolean;
  onReserve: () => void; onConfirm: () => void; onLeave: () => void;
}) {
  const isOwn = !!userId && slot.reservedByUserId === userId;
  const isPending = slotIsPending(slot);
  const isConfirmed = slotIsConfirmed(slot);

  const cardBg = isOwn
    ? isConfirmed ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'
    : slot.isReserved ? 'bg-gray-100 border-gray-200' : 'bg-white border-gray-200';

  return (
    <div className={cn('border rounded-lg p-3 mb-2', cardBg)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0',
            isOwn ? (isConfirmed ? 'bg-green-500' : 'bg-blue-500') : slot.isReserved ? 'bg-gray-400' : 'bg-indigo-600',
          )}>
            {slot.slotNumber}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800">Position {slot.slotNumber}</p>
            <p className="text-xs text-gray-500">Team: {TEAM_DISPLAY[slot.team]}</p>
            {slot.isReserved && (
              <>
                {isOwn ? (
                  <p className={cn('text-xs font-bold', isPending ? 'text-orange-600' : 'text-green-600')}>
                    {isPending ? 'Pending Confirmation' : 'Confirmed'}
                  </p>
                ) : (
                  <p className="text-xs font-bold text-red-500">Occupied</p>
                )}
                {slot.reservedByUsername && (
                  <p className={cn('text-xs', isOwn ? 'text-blue-700 font-bold' : 'text-gray-500')}>
                    {isOwn ? 'Your slot' : slot.reservedByUsername}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex gap-1.5 flex-shrink-0">
          {isOwn && isPending && (
            <Button variant="success" size="sm" onClick={onConfirm}>Confirm</Button>
          )}
          {isOwn && (
            <Button variant="danger" size="sm" onClick={onLeave}>Leave</Button>
          )}
          {!slot.isReserved && (
            <Button variant="primary" size="sm" onClick={onReserve} disabled={hasActiveReservation}>
              Reserve
            </Button>
          )}
          {slot.isReserved && !isOwn && (
            <span className="text-xs text-gray-400 py-1.5">Occupied</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Details tab ───────────────────────────────────────────────────────────────
function DetailsTab({ game }: { game: Game }) {
  const rows = [
    ['Status', GAME_STATUS_DISPLAY[game.status]],
    ['Scheduled', formatDateTime(game.scheduledStartTime)],
    ...(game.actualStartTime ? [['Started', formatDateTime(game.actualStartTime)]] : []),
    ...(game.actualEndTime ? [['Ended', formatDateTime(game.actualEndTime)]] : []),
    ['Total Slots', String(game.slots.length)],
    ['Available', String(availableSlotsCount(game))],
    ['Reserved', String(reservedSlotsCount(game))],
  ];
  return (
    <div className="p-4 overflow-y-auto">
      {rows.map(([label, value]) => (
        <div key={label} className="flex py-3 border-b border-gray-100 last:border-0">
          <span className="w-28 text-xs font-bold text-gray-400 uppercase shrink-0">{label}</span>
          <span className="text-sm text-gray-800">{value}</span>
        </div>
      ))}
      {game.isExclusiveToGold && (
        <div className="mt-4 bg-amber-50 border border-amber-300 rounded-lg p-3 flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="text-sm font-bold text-amber-700">Gold Subscription Exclusive</span>
        </div>
      )}
    </div>
  );
}

// ─── Slots tab ─────────────────────────────────────────────────────────────────
function SlotsTab({
  game, userId, hasActiveReservation,
  onReserve, onConfirm, onLeave,
}: {
  game: Game; userId?: number; hasActiveReservation: boolean;
  onReserve: (slotId: number, team: Team) => void;
  onConfirm: (slot: Slot) => void;
  onLeave: (slot: Slot) => void;
}) {
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  const teamSlots = game.slots.filter(s => s.team === selectedTeam);

  return (
    <div className="p-4 overflow-y-auto">
      {hasActiveReservation && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4 flex items-start gap-2">
          <Info className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
          <p className="text-xs text-orange-700">
            You already have an active reservation. You can view slots but cannot reserve a new one.
          </p>
        </div>
      )}

      <p className="text-sm font-bold text-gray-800 mb-3">Select a team and slot:</p>
      <div className="flex gap-3 mb-5">
        {(['A', 'B'] as Team[]).map(team => (
          <button
            key={team}
            onClick={() => setSelectedTeam(t => t === team ? null : team)}
            className={cn(
              'flex-1 py-2 rounded-lg border text-sm font-medium transition-colors',
              selectedTeam === team
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'border-gray-300 text-gray-600 bg-white',
            )}
          >
            {TEAM_DISPLAY[team]}
          </button>
        ))}
      </div>

      {selectedTeam === null && (
        <p className="text-sm text-gray-400 text-center py-4">Please select a team first</p>
      )}

      {selectedTeam && (
        <>
          <p className="text-sm font-bold text-gray-700 mb-3">
            Slots for {TEAM_DISPLAY[selectedTeam]}:
          </p>
          {teamSlots.length === 0
            ? <p className="text-sm text-gray-400 text-center py-4">No slots for this team</p>
            : teamSlots.map(slot => (
                <SlotCard
                  key={slot.id}
                  slot={slot}
                  userId={userId}
                  hasActiveReservation={hasActiveReservation}
                  onReserve={() => onReserve(slot.id, slot.team)}
                  onConfirm={() => onConfirm(slot)}
                  onLeave={() => onLeave(slot)}
                />
              ))}
        </>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function GameDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const gameId = parseInt(id, 10);
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'details' | 'slots'>('details');
  const [dialog, setDialog] = useState<{
    type: 'reserve' | 'confirm' | 'leave';
    slotId?: number;
    team?: Team;
    slot?: Slot;
  } | null>(null);

  const { data: game, isLoading, error, refetch } = useQuery({
    queryKey: ['game', gameId],
    queryFn: () => api.getGameDetails(gameId),
  });

  const { data: myReservations = [] } = useQuery({
    queryKey: ['myReservations'],
    queryFn: api.getMyReservations,
  });

  const hasActiveReservation = myReservations.some(
    r => reservationIsActive(r) && r.gameId !== gameId,
  );

  // Join/leave WebSocket event room
  useEffect(() => {
    wsManager.joinEvent(gameId);
    return () => wsManager.leaveEvent(gameId);
  }, [gameId]);

  // Listen for slot updates
  useEffect(() => {
    const off = wsManager.on('slot:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['game', gameId] });
    });
    return off;
  }, [gameId, queryClient]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['game', gameId] });
    queryClient.invalidateQueries({ queryKey: ['myReservations'] });
  }, [gameId, queryClient]);

  const reserveMutation = useMutation({
    mutationFn: ({ slotId, team }: { slotId: number; team: Team }) =>
      api.reserveSlot(gameId, slotId, team, false),
    onSuccess: () => { toast.success('Slot reserved successfully!'); invalidate(); },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to reserve'),
  });

  const confirmMutation = useMutation({
    mutationFn: (reservationId: number) => api.confirmReservation(reservationId),
    onSuccess: () => { toast.success('Reservation confirmed!'); invalidate(); },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to confirm'),
  });

  const cancelMutation = useMutation({
    mutationFn: (reservationId: number) => api.cancelReservation(reservationId),
    onSuccess: () => { toast.success('Reservation cancelled'); invalidate(); },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to cancel'),
  });

  if (isLoading) return <Loading message="Loading game details..." />;
  if (error || !game) return <ErrorDisplay message={String(error ?? 'Game not found')} onRetry={refetch} />;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-2 pt-3 pb-0">
        <div className="flex items-center gap-2 px-2 pb-2">
          <button onClick={() => router.back()} className="p-1.5 text-gray-500 hover:text-gray-700">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold text-gray-900 flex-1">
            Game · {formatTime(game.scheduledStartTime)}
          </h1>
          {game.isExclusiveToGold && <Star className="w-4 h-4 text-amber-500" />}
        </div>
        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {[
            { key: 'details', label: 'Details', icon: Info },
            { key: 'slots',   label: 'Slots',   icon: Layers },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as typeof activeTab)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium border-b-2 transition-colors',
                activeTab === key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-400',
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'details'
          ? <DetailsTab game={game} />
          : (
              <SlotsTab
                game={game}
                userId={user?.id}
                hasActiveReservation={hasActiveReservation}
                onReserve={(slotId, team) => {
                  if (hasActiveReservation) {
                    toast.warning('You already have an active reservation');
                    return;
                  }
                  setDialog({ type: 'reserve', slotId, team });
                }}
                onConfirm={slot => setDialog({ type: 'confirm', slot })}
                onLeave={slot => setDialog({ type: 'leave', slot })}
              />
            )}
      </div>

      {/* Dialogs */}
      {dialog?.type === 'reserve' && (
        <ConfirmDialog
          title="Confirm Reservation"
          message={`Reserve slot for team ${TEAM_DISPLAY[dialog.team!]}?`}
          confirmLabel="Reserve"
          onConfirm={() => {
            reserveMutation.mutate({ slotId: dialog.slotId!, team: dialog.team! });
            setDialog(null);
          }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'confirm' && (
        <ConfirmDialog
          title="Confirm Reservation"
          message={`Confirm your reservation for Position ${dialog.slot!.slotNumber} on Team ${TEAM_DISPLAY[dialog.slot!.team]}?`}
          confirmLabel="Confirm"
          confirmVariant="success"
          onConfirm={() => {
            if (dialog.slot!.reservationId) confirmMutation.mutate(dialog.slot!.reservationId);
            setDialog(null);
          }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'leave' && (
        <ConfirmDialog
          title="Leave Slot"
          message={`Are you sure you want to leave Position ${dialog.slot!.slotNumber}? This will cancel your reservation.`}
          confirmLabel="Leave"
          confirmVariant="danger"
          onConfirm={() => {
            if (dialog.slot!.reservationId) cancelMutation.mutate(dialog.slot!.reservationId);
            setDialog(null);
          }}
          onCancel={() => setDialog(null)}
        />
      )}
    </div>
  );
}

