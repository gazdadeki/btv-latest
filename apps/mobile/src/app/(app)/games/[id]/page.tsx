"use client";

// Translated from Mobile/lib/features/game/pages/game_details_page.dart
// Two tabs: Details and Slots. WebSocket join/leave event room on mount/unmount.
// Reserve, Confirm, Leave reservation flows with dialogs.

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Star, Info, Layers } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { wsManager } from "@/lib/websocket";
import { useAuth } from "@/lib/auth-context";
import { MESSAGES, LIMITS } from "@/lib/constants";
import { Loading } from "@/components/loading";
import { ErrorDisplay } from "@/components/error-display";
import { Button } from "@/components/button";
import { cn, formatDateTime } from "@/lib/utils";
import {
  type Game,
  type Slot,
  type Team,
  GAME_STATUS_DISPLAY,
  TEAM_DISPLAY,
  availableSlotsCount,
  reservedSlotsCount,
  slotIsPending,
  slotIsConfirmed,
  reservationIsActive,
  gameIsInProgress,
  gameIsFinished,
  gameIsCancelled,
  isGold,
} from "@/types";

// ─── Confirm dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({
  title,
  message,
  confirmLabel,
  confirmVariant,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant?: "primary" | "danger" | "success";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={onCancel}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-xl w-full max-w-sm p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-5">{message}</p>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant={confirmVariant ?? "primary"}
            size="sm"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Slot card ─────────────────────────────────────────────────────────────────
function SlotCard({
  slot,
  userId,
  isGoldUser,
  restrictionsLifted,
  hasActiveReservation,
  locked,
  onReserve,
  onConfirm,
  onLeave,
}: {
  slot: Slot;
  userId?: number;
  isGoldUser: boolean;
  restrictionsLifted: boolean;
  hasActiveReservation: boolean;
  locked: boolean;
  onReserve: () => void;
  onConfirm: () => void;
  onLeave: () => void;
}) {
  const isOwn = !!userId && slot.reservedByUserId === userId;
  const isPending = slotIsPending(slot);
  const showGoldOnly = slot.isGoldOnly && !restrictionsLifted;
  const isConfirmed = slotIsConfirmed(slot);

  const cardBg = isOwn
    ? isConfirmed
      ? "bg-green-50 border-green-200"
      : "bg-blue-50 border-blue-200"
    : slot.isReserved
      ? "bg-gray-100 border-gray-200"
      : "bg-white border-gray-200";

  return (
    <div className={cn("border rounded-lg p-3 mb-2", cardBg)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0",
              isOwn
                ? isConfirmed
                  ? "bg-green-500"
                  : "bg-blue-500"
                : slot.isReserved
                  ? slot.reservedByRole === "admin"
                    ? "bg-red-500"
                    : "bg-gray-400"
                  : showGoldOnly
                    ? "bg-amber-500"
                    : "bg-indigo-600",
            )}
          >
            {slot.slotNumber}
          </div>
          <div>
            {!slot.isReserved && (
              <p className="text-sm font-medium text-gray-400">
                Position {slot.slotNumber}
              </p>
            )}
            {slot.isReserved && (
              <>
                {isOwn ? (
                  <p
                    className={cn(
                      "text-xs font-bold",
                      isPending ? "text-orange-600" : "text-green-600",
                    )}
                  >
                    {isPending ? "Pending Confirmation" : "Confirmed"}
                  </p>
                ) : null}
                {slot.reservedByUsername && (
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      isOwn
                        ? "text-blue-700"
                        : slot.reservedByRole === "admin"
                          ? "text-red-600"
                          : "text-gray-600",
                    )}
                  >
                    {isOwn ? "Your slot" : slot.reservedByUsername}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex gap-1.5 flex-shrink-0">
          {locked ? (
            !slot.isReserved ? (
              <span className="text-xs text-gray-400 py-1.5">Locked</span>
            ) : null
          ) : (
            <>
              {isOwn && isPending && (
                <Button variant="success" size="sm" onClick={onConfirm}>
                  Confirm
                </Button>
              )}
              {isOwn && (
                <Button variant="danger" size="sm" onClick={onLeave}>
                  Leave
                </Button>
              )}
              {!slot.isReserved &&
                (showGoldOnly && !isGoldUser ? (
                  <span className="text-xs text-amber-600 py-1.5 flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    Gold Only
                  </span>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={onReserve}
                    disabled={hasActiveReservation}
                  >
                    Reserve
                  </Button>
                ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Details tab ───────────────────────────────────────────────────────────────
function DetailsTab({ game }: { game: Game }) {
  const rows = [
    ["Status", GAME_STATUS_DISPLAY[game.status]],
    ["Scheduled", formatDateTime(game.scheduledStartTime)],
    ...(game.actualStartTime
      ? [["Started", formatDateTime(game.actualStartTime)]]
      : []),
    ...(game.actualEndTime
      ? [["Ended", formatDateTime(game.actualEndTime)]]
      : []),
    ["Total Slots", String(game.slots.length)],
    ["Available", String(availableSlotsCount(game))],
    ["Reserved", String(reservedSlotsCount(game))],
  ];
  return (
    <div className="p-4 overflow-y-auto">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex py-3 border-b border-gray-100 last:border-0"
        >
          <span className="w-28 text-xs font-bold text-gray-400 uppercase shrink-0">
            {label}
          </span>
          <span className="text-sm text-gray-800">{value}</span>
        </div>
      ))}
      {gameIsFinished(game) && game.winningTeam && (
        <div className="flex py-3 border-b border-gray-100">
          <span className="w-28 text-xs font-bold text-gray-400 uppercase shrink-0">
            Winner
          </span>
          <span
            className={cn(
              "text-xs font-bold px-2 py-0.5 rounded border",
              game.winningTeam === "A"
                ? "text-red-600 bg-red-50 border-red-200"
                : "text-green-600 bg-green-50 border-green-200",
            )}
          >
            {TEAM_DISPLAY[game.winningTeam]}
          </span>
        </div>
      )}
      {game.isExclusiveToGold && (
        <div className="mt-4 bg-amber-50 border border-amber-300 rounded-lg p-3 flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="text-sm font-bold text-amber-700">
            Gold Subscription Exclusive
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Slots tab ─────────────────────────────────────────────────────────────────
function SlotsTab({
  game,
  userId,
  isGoldUser,
  hasActiveReservation,
  atReservationLimit,
  tooCloseToExisting,
  locked,
  onReserve,
  onConfirm,
  onLeave,
}: {
  game: Game;
  userId?: number;
  isGoldUser: boolean;
  hasActiveReservation: boolean;
  atReservationLimit: boolean;
  tooCloseToExisting: boolean;
  locked: boolean;
  onReserve: (slotId: number, team: Team) => void;
  onConfirm: (slot: Slot) => void;
  onLeave: (slot: Slot) => void;
}) {
  const teamA = game.slots
    .filter((s) => s.team === "A")
    .sort((a, b) => a.slotNumber - b.slotNumber);
  const teamB = game.slots
    .filter((s) => s.team === "B")
    .sort((a, b) => a.slotNumber - b.slotNumber);

  const renderTeam = (slots: Slot[], label: string, colorClass: string) => (
    <div className="mb-4">
      <h3
        className={cn(
          "text-base font-extrabold uppercase tracking-wide mb-2 pb-1.5 border-b-2",
          colorClass,
        )}
      >
        {label}
      </h3>
      {slots.map((slot) => (
        <SlotCard
          key={slot.id}
          slot={slot}
          userId={userId}
          isGoldUser={isGoldUser}
          restrictionsLifted={!!game.allowMultipleReservations}
          hasActiveReservation={hasActiveReservation}
          locked={locked}
          onReserve={() => onReserve(slot.id, slot.team)}
          onConfirm={() => onConfirm(slot)}
          onLeave={() => onLeave(slot)}
        />
      ))}
    </div>
  );

  return (
    <div className="p-4 overflow-y-auto">
      {locked && gameIsInProgress(game) && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 flex items-start gap-2">
          <Info className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
          <p className="text-xs text-gray-600">
            This game is in progress. Slots are locked and reservations are no
            longer available.
          </p>
        </div>
      )}
      {!locked && hasActiveReservation && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4 flex items-start gap-2">
          <Info className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
          <p className="text-xs text-orange-700">
            {tooCloseToExisting
              ? MESSAGES.reservation.tooClose
              : atReservationLimit
                ? isGoldUser
                  ? MESSAGES.reservation.goldAtLimit
                  : MESSAGES.reservation.freeAtLimit
                : MESSAGES.reservation.cannotReserve}
          </p>
        </div>
      )}

      {renderTeam(teamA, TEAM_DISPLAY.A, "border-red-600 text-red-600")}
      {renderTeam(teamB, TEAM_DISPLAY.B, "border-green-600 text-green-600")}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function GameDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const gameId = parseInt(id, 10);
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"details" | "slots">("slots");
  const [dialog, setDialog] = useState<{
    type: "reserve" | "confirm" | "leave";
    slotId?: number;
    team?: Team;
    slot?: Slot;
  } | null>(null);

  const {
    data: game,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["game", gameId],
    queryFn: () => api.getGameDetails(gameId),
  });

  const { data: myReservations = [] } = useQuery({
    queryKey: ["myReservations"],
    queryFn: api.getMyReservations,
  });

  const isUserGold = !!user && isGold(user);
  const maxReservations = isUserGold
    ? LIMITS.GOLD_MAX_RESERVATIONS
    : LIMITS.FREE_MAX_RESERVATIONS;

  const activeStreamReservations = myReservations.filter(
    (r) =>
      reservationIsActive(r) &&
      r.gameId !== gameId &&
      r.game?.streamId != null &&
      r.game.streamId === game?.streamId &&
      !r.game.allowMultipleReservations,
  );

  const atReservationLimit =
    !game?.allowMultipleReservations &&
    activeStreamReservations.length >= maxReservations;

  const tooCloseToExisting =
    !game?.allowMultipleReservations &&
    isUserGold &&
    game?.gameIndex != null &&
    activeStreamReservations.some(
      (r) =>
        r.game?.gameIndex != null &&
        Math.abs(r.game.gameIndex - game.gameIndex!) < LIMITS.GOLD_MIN_GAME_GAP,
    );

  const hasSlotInThisGame =
    !!user &&
    !!game?.slots?.some((s) => s.isReserved && s.reservedByUserId === user.id);

  const hasActiveReservation =
    hasSlotInThisGame || atReservationLimit || tooCloseToExisting;

  // Join/leave WebSocket event room
  useEffect(() => {
    wsManager.joinEvent(gameId);
    return () => wsManager.leaveEvent(gameId);
  }, [gameId]);

  // Listen for slot updates and game status changes
  useEffect(() => {
    const invalidateGame = () => {
      queryClient.invalidateQueries({ queryKey: ["game", gameId] });
    };
    const invalidateGameAndReservations = () => {
      queryClient.invalidateQueries({ queryKey: ["game", gameId] });
      queryClient.invalidateQueries({ queryKey: ["myReservations"] });
    };
    const offs = [
      wsManager.on("slot:availability_changed", invalidateGameAndReservations),
      wsManager.on("game:status_changed", invalidateGame),
      wsManager.on("game:updated", invalidateGame),
      wsManager.on("reservation:confirmed", invalidateGameAndReservations),
      wsManager.on("reservation:cancelled", invalidateGameAndReservations),
    ];
    return () => offs.forEach((off) => off());
  }, [gameId, queryClient]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["game", gameId] });
    queryClient.invalidateQueries({ queryKey: ["myReservations"] });
  }, [gameId, queryClient]);

  const reserveMutation = useMutation({
    mutationFn: ({ slotId, team }: { slotId: number; team: Team }) =>
      api.reserveSlot(gameId, slotId, team, false),
    onSuccess: () => {
      toast.success("Slot reserved successfully!");
      invalidate();
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to reserve"),
  });

  const confirmMutation = useMutation({
    mutationFn: (reservationId: number) =>
      api.confirmReservation(reservationId),
    onSuccess: () => {
      toast.success("Reservation confirmed!");
      invalidate();
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to confirm"),
  });

  const cancelMutation = useMutation({
    mutationFn: (reservationId: number) => api.cancelReservation(reservationId),
    onSuccess: () => {
      toast.success("Reservation cancelled");
      invalidate();
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to cancel"),
  });

  const slotsLocked =
    !!game &&
    (gameIsInProgress(game) || gameIsFinished(game) || gameIsCancelled(game));

  if (isLoading) return <Loading message="Loading game details..." />;
  if (error || !game)
    return (
      <ErrorDisplay
        message={String(error ?? "Game not found")}
        onRetry={refetch}
      />
    );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-2 pt-3 pb-0">
        <div className="flex items-center gap-2 px-2 pb-2">
          <button
            onClick={() => router.back()}
            className="p-1.5 text-gray-500 hover:text-gray-700"
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5" aria-hidden="true" />
          </button>
          <h1 className="text-base font-bold text-gray-900 flex-1">
            Game {game.gameIndex ?? game.id}
          </h1>
          {game.isExclusiveToGold && (
            <Star className="w-4 h-4 text-amber-500" />
          )}
        </div>
        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {[
            { key: "slots", label: "Slots", icon: Layers },
            { key: "details", label: "Details", icon: Info },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as typeof activeTab)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === key
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-400",
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
        {activeTab === "details" ? (
          <DetailsTab game={game} />
        ) : (
          <SlotsTab
            game={game}
            userId={user?.id}
            isGoldUser={isUserGold}
            hasActiveReservation={hasActiveReservation}
            atReservationLimit={atReservationLimit}
            tooCloseToExisting={tooCloseToExisting}
            locked={slotsLocked}
            onReserve={(slotId, team) => {
              if (hasActiveReservation) {
                toast.warning(
                  hasSlotInThisGame
                    ? MESSAGES.reservation.toastAlreadyInGame
                    : tooCloseToExisting
                      ? MESSAGES.reservation.toastTooClose
                      : MESSAGES.reservation.toastAtLimit,
                );
                return;
              }
              setDialog({ type: "reserve", slotId, team });
            }}
            onConfirm={(slot) => setDialog({ type: "confirm", slot })}
            onLeave={(slot) => setDialog({ type: "leave", slot })}
          />
        )}
      </div>

      {/* Dialogs */}
      {dialog?.type === "reserve" && (
        <ConfirmDialog
          title="Confirm Reservation"
          message={`Reserve slot for team ${TEAM_DISPLAY[dialog.team!]}?`}
          confirmLabel="Reserve"
          onConfirm={() => {
            reserveMutation.mutate({
              slotId: dialog.slotId!,
              team: dialog.team!,
            });
            setDialog(null);
          }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.type === "confirm" && (
        <ConfirmDialog
          title="Confirm Reservation"
          message={`Confirm your reservation for Position ${dialog.slot!.slotNumber} on Team ${TEAM_DISPLAY[dialog.slot!.team]}?`}
          confirmLabel="Confirm"
          confirmVariant="success"
          onConfirm={() => {
            if (dialog.slot!.reservationId)
              confirmMutation.mutate(dialog.slot!.reservationId);
            setDialog(null);
          }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.type === "leave" && (
        <ConfirmDialog
          title="Leave Slot"
          message={`Are you sure you want to leave Position ${dialog.slot!.slotNumber}? This will cancel your reservation.`}
          confirmLabel="Leave"
          confirmVariant="danger"
          onConfirm={() => {
            if (dialog.slot!.reservationId)
              cancelMutation.mutate(dialog.slot!.reservationId);
            setDialog(null);
          }}
          onCancel={() => setDialog(null)}
        />
      )}
    </div>
  );
}
