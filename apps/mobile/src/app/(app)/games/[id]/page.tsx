"use client";

// Translated from Mobile/lib/features/game/pages/game_details_page.dart
// Two tabs: Details and Slots. WebSocket join/leave event room on mount/unmount.
// Reserve, Confirm, Leave reservation flows with dialogs.

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Star, Info, Layers, X } from "lucide-react";
import { GiBroadsword } from "react-icons/gi";
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
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="panel-dark relative w-full max-w-sm p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-[#f0f0f0] mb-2">{title}</h3>
        <p className="text-sm text-[#c0b8a8] mb-5">{message}</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="btn-dark-secondary px-3 py-1.5 text-sm font-medium"
          >
            Cancel
          </button>
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
  goldSlotsAvailable,
  locked,
  reserveDisabled,
  onReserve,
  onConfirm,
  onLeave,
}: {
  slot: Slot;
  userId?: number;
  isGoldUser: boolean;
  restrictionsLifted: boolean;
  hasActiveReservation: boolean;
  goldSlotsAvailable: boolean;
  locked: boolean;
  reserveDisabled: boolean;
  onReserve: () => void;
  onConfirm: () => void;
  onLeave: () => void;
}) {
  const isOwn = !!userId && slot.reservedByUserId === userId;
  const isPending = slotIsPending(slot);
  const showGoldOnly = slot.isGoldOnly && !restrictionsLifted;
  const isConfirmed = slotIsConfirmed(slot);
  // Gold users must fill gold slots first before reserving free slots
  const mustUseGoldFirst =
    isGoldUser && !restrictionsLifted && !slot.isGoldOnly && goldSlotsAvailable;

  return (
    <div
      className="mb-2"
      style={{
        backgroundImage: "url('/frames/game-card-border.png')",
        backgroundSize: "100% 100%",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="flex items-center justify-between gap-2 px-5 h-14 overflow-hidden">
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0",
              isOwn
                ? isConfirmed
                  ? "bg-[#3d8f5f]"
                  : "bg-blue-500"
                : slot.isReserved
                  ? slot.reservedByRole === "admin"
                    ? "bg-[#9c3e3b]"
                    : "bg-gray-400"
                  : showGoldOnly
                    ? "bg-[#c9a84c]"
                    : "bg-[#2a9d8f]",
            )}
          >
            {slot.slotNumber}
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            {!slot.isReserved && (
              <p className="text-sm font-medium text-[#8a8a8a]">Open</p>
            )}
            {slot.isReserved && slot.reservedByUsername && (
              <>
                <p
                  className={cn(
                    "text-sm font-semibold leading-tight",
                    isOwn
                      ? "text-[#f0f0f0]"
                      : slot.reservedByRole === "admin"
                        ? "text-[#c45a57]"
                        : "text-[#a89f8e]",
                  )}
                >
                  {slot.reservedByUsername}
                </p>
                {isOwn && isPending && (
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#2a9d8f] leading-none mt-0.5">
                    Pending
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {locked ? (
            !slot.isReserved ? (
              <span className="text-xs text-[#6a6a6a]">Locked</span>
            ) : null
          ) : isOwn ? (
            <>
              {isPending && (
                <Button
                  variant="gold"
                  size="sm"
                  onClick={onConfirm}
                  className="min-w-[104px] text-xs font-bold uppercase tracking-wider"
                >
                  Confirm
                </Button>
              )}
              <button
                onClick={onLeave}
                aria-label="Leave slot"
                className="w-8 h-8 rounded-full flex items-center justify-center bg-[#9c3e3b] text-white hover:bg-[#b8524e] transition-colors shrink-0"
              >
                <X className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </>
          ) : !slot.isReserved ? (
            showGoldOnly && !isGoldUser ? (
              <span className="text-xs text-[#c9a84c] flex items-center gap-1">
                <Star className="w-3 h-3 text-[#c9a84c] fill-[#c9a84c]" />
                Gold Only
              </span>
            ) : (
              <Button
                variant={showGoldOnly ? "gold" : "primary"}
                size="sm"
                onClick={onReserve}
                disabled={
                  reserveDisabled || hasActiveReservation || mustUseGoldFirst
                }
                className="min-w-[104px] text-xs font-bold uppercase tracking-wider"
              >
                Reserve
              </Button>
            )
          ) : null}
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
      <div className="panel-dark px-4">
        {rows.map(([label, value], idx) => (
          <div
            key={label}
            className={cn(
              "flex py-3",
              idx < rows.length - 1 ||
                (gameIsFinished(game) && game.winningTeam)
                ? "row-divider"
                : "",
            )}
          >
            <span className="w-28 text-xs font-bold text-[#8a8a8a] uppercase shrink-0">
              {label}
            </span>
            <span className="text-sm text-[#e0d8c8] flex-1">{value}</span>
          </div>
        ))}
        {gameIsFinished(game) && game.winningTeam && (
          <div className="flex items-center py-3">
            <span className="w-28 text-xs font-bold text-[#8a8a8a] uppercase shrink-0">
              Winner
            </span>
            <span
              className={cn(
                "text-xs font-bold px-2 py-0.5 rounded border",
                game.winningTeam === "A"
                  ? "text-red-300 bg-red-900/40 border-red-800"
                  : "text-green-300 bg-green-900/40 border-green-800",
              )}
            >
              {TEAM_DISPLAY[game.winningTeam]}
            </span>
          </div>
        )}
      </div>
      {game.isExclusiveToGold && (
        <div className="panel-dark mt-4 p-3 flex items-center gap-2 border-[#c9a84c]/40">
          <Star className="w-4 h-4 text-[#c9a84c] fill-[#c9a84c] shrink-0" />
          <span className="text-sm font-bold text-[#c9a84c]">
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
  reserveDisabled,
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
  reserveDisabled: boolean;
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
  const goldSlotsAvailable = game.slots.some(
    (s) => s.isGoldOnly && !s.isReserved,
  );

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
          goldSlotsAvailable={goldSlotsAvailable}
          locked={locked}
          reserveDisabled={reserveDisabled}
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
        <div className="panel-sunken p-3 mb-4 flex items-start gap-2">
          <Info className="w-4 h-4 text-[#8a8a8a] shrink-0 mt-0.5" />
          <p className="text-xs text-[#8a8a8a]">
            This game is in progress. Slots are locked and reservations are no
            longer available.
          </p>
        </div>
      )}
      {!locked && hasActiveReservation && (
        <div className="panel-sunken p-3 mb-4 flex items-start gap-2 border-l-2 border-l-[#c9a84c]">
          <Info className="w-4 h-4 text-[#c9a84c] shrink-0 mt-0.5" />
          <p className="text-xs text-[#e0d8c8]">
            {atReservationLimit
              ? isGoldUser
                ? MESSAGES.reservation.goldAtLimit
                : MESSAGES.reservation.freeAtLimit
              : tooCloseToExisting
                ? MESSAGES.reservation.tooClose
                : MESSAGES.reservation.alreadyInGame}
          </p>
        </div>
      )}

      {renderTeam(teamA, TEAM_DISPLAY.A, "border-[#2a2620] text-red-500")}
      {renderTeam(teamB, TEAM_DISPLAY.B, "border-[#2a2620] text-green-500")}
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

  useEffect(() => {
    if (game && gameIsFinished(game)) {
      setActiveTab("details");
    }
  }, [game?.id, game?.status]);

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

  // Gold-first: during CREATED status only gold users can reserve. Free users
  // see a disabled Reserve button (not hidden) so they know it will unlock.
  const reserveDisabledForPreOpen =
    !!game && game.status === "CREATED" && !isUserGold;

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
      <div className="arena-header px-2 pt-3 pb-0 shrink-0">
        <div className="grid grid-cols-[3rem_1fr_3rem] items-center pb-2">
          <button
            onClick={() => router.back()}
            className="p-1.5 text-[#c9a84c] hover:text-[#d4b04a] justify-self-start"
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5" aria-hidden="true" />
          </button>
          <div className="flex items-center justify-center gap-2 min-w-0">
            <GiBroadsword
              className="w-5 h-5 text-[#c9a84c] shrink-0"
              aria-hidden="true"
            />
            <h1
              className="font-title text-base font-bold uppercase tracking-wider text-[#f0f0f0] truncate"
              title={`Game ${game.gameIndex ?? game.id}`}
            >
              Game {game.gameIndex ?? game.id}
            </h1>
            <GiBroadsword
              className="w-5 h-5 text-[#c9a84c] shrink-0 -scale-x-100"
              aria-hidden="true"
            />
          </div>
          <div className="justify-self-end pr-1">
            {game.isExclusiveToGold && (
              <Star className="w-4 h-4 text-[#c9a84c] fill-[#c9a84c]" />
            )}
          </div>
        </div>
        {/* Tabs */}
        <div className="flex border-b border-[#2a2620]">
          {[
            { key: "slots", label: "Slots", icon: Layers },
            { key: "details", label: "Details", icon: Info },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as typeof activeTab)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors",
                activeTab === key
                  ? "border-[#c9a84c] text-[#c9a84c]"
                  : "border-transparent text-[#7a7366] hover:text-[#a89f8e]",
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
            reserveDisabled={reserveDisabledForPreOpen}
            onReserve={(slotId, team) => {
              if (hasActiveReservation) {
                toast.warning(
                  hasSlotInThisGame
                    ? MESSAGES.reservation.toastAlreadyInGame
                    : atReservationLimit
                      ? MESSAGES.reservation.toastAtLimit
                      : MESSAGES.reservation.toastTooClose,
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
