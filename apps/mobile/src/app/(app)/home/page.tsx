"use client";

// Home page: Gold Member banner, filter chips, games feed
// Dark gaming aesthetic

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, Lock } from "lucide-react";
import { RiShieldStarFill, RiVipCrownFill } from "react-icons/ri";
import { GiCrossedSwords } from "react-icons/gi";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";
import { wsManager } from "@/lib/websocket";
import { useAuth } from "@/lib/auth-context";
import { Loading } from "@/components/loading";
import { EmptyState } from "@/components/empty-state";
import { ErrorDisplay } from "@/components/error-display";
import { cn, formatTime } from "@/lib/utils";
import type { Game, GameStatusFilter, Slot } from "@/types";
import {
  isGold,
  reservationIsActive,
  availableSlotsCount,
  AVATAR_PLACEHOLDER_URL,
} from "@/types";

const MAX_VISIBLE_AVATARS = 6;

function ReservedAvatars({ slots }: { slots: Slot[] }) {
  const reserved = slots.filter((s) => s.isReserved);
  if (reserved.length === 0) return null;
  const visible = reserved.slice(0, MAX_VISIBLE_AVATARS);
  const overflow = reserved.length - visible.length;
  return (
    <div className="flex items-center -space-x-1.5">
      {visible.map((slot) => (
        <div
          key={slot.id}
          className="w-6 h-6 rounded-full overflow-hidden border border-[#0f0e0c] ring-1 ring-[#3a342c] bg-[#1a1612]"
          title={slot.reservedByUsername ?? undefined}
        >
          <img
            src={slot.reservedByAvatarUrl ?? AVATAR_PLACEHOLDER_URL}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover object-top"
          />
        </div>
      ))}
      {overflow > 0 && (
        <div className="w-6 h-6 rounded-full border border-[#0f0e0c] ring-1 ring-[#3a342c] bg-[#1a1612] flex items-center justify-center text-[9px] font-bold text-[#c9a84c]">
          +{overflow}
        </div>
      )}
    </div>
  );
}

const DEFAULT_FILTER: GameStatusFilter = {
  includeCreated: true,
  includeOpen: true,
  includeInProgress: true,
  includeFinished: true,
  includeCancelled: false,
};

function GoldMemberBanner() {
  return (
    <div className="gold-banner px-4 py-3 flex items-center gap-3">
      <RiShieldStarFill className="w-6 h-6 text-[#1a1200] shrink-0" />
      <span className="text-[#1a1200] font-bold text-base tracking-wide">
        Gold Member
      </span>
    </div>
  );
}

function GameCard({
  game,
  hasActiveReservation,
  isLocked,
  onTap,
}: {
  game: Game;
  hasActiveReservation: boolean;
  isLocked: boolean;
  onTap: () => void;
}) {
  const status = game.status;
  const isAvailable = status === "CREATED" || status === "OPEN";
  const isInProgress = status === "IN_PROGRESS";
  const isFinished = status === "FINISHED";
  const isCancelled = status === "CANCELLED";
  const totalSlots = game.slots.length;
  const taken = totalSlots - availableSlotsCount(game);
  const isFull = availableSlotsCount(game) === 0;

  return (
    <button
      onClick={onTap}
      className={cn(
        "w-full text-left px-6 py-5 mb-2 transition-transform active:scale-[0.98]",
        game.isExclusiveToGold && "game-card--gold",
      )}
      style={{
        backgroundImage: "url('/frames/game-card-border.png')",
        backgroundSize: "100% 100%",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: game title + reserved avatars */}
        <div className="min-w-0 flex-1 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            {game.isExclusiveToGold && (
              <RiVipCrownFill className="w-4 h-4 text-[#c9a84c] shrink-0" />
            )}
            <span className="text-sm font-bold text-[#f0f0f0] truncate">{`Game ${game.gameIndex ?? game.id}`}</span>
          </div>
          <ReservedAvatars slots={game.slots} />
        </div>

        {/* Right: status-dependent content */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          {isInProgress && (
            <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-red-700 text-white">
              In Progress
            </span>
          )}

          {isFinished && (
            <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-600 text-gray-200">
              Finished
            </span>
          )}

          {isCancelled && (
            <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-red-900 text-red-300">
              Cancelled
            </span>
          )}

          {isAvailable && (
            <>
              <span className="text-xs text-[#8a8a8a]">
                Players: {taken}/{totalSlots}
              </span>
              {isFull ? (
                <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-600 text-gray-200">
                  Full
                </span>
              ) : hasActiveReservation ? (
                <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-green-700 text-white">
                  Reserved
                </span>
              ) : isLocked ? (
                <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-700 text-gray-300 inline-flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Locked
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-[#2a9d8f] text-white">
                  Reserve
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </button>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<GameStatusFilter>(DEFAULT_FILTER);

  const {
    data: activeStream,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["activeStream", filter],
    queryFn: () => api.getActiveStream(filter),
  });

  const { data: myReservations = [] } = useQuery({
    queryKey: ["myReservations"],
    queryFn: api.getMyReservations,
  });

  const streamId = activeStream?.stream?.id;
  const activeReservations = myReservations.filter(
    (r) =>
      reservationIsActive(r) &&
      r.game?.streamId != null &&
      r.game.streamId === streamId,
  );

  // Refresh games list on real-time game lifecycle events.
  // Debounced so bursts (e.g. stream end cancels all games + reservations)
  // collapse into a single refetch instead of one per event.
  useEffect(() => {
    const DEBOUNCE_MS = 300;
    let streamTimer: ReturnType<typeof setTimeout> | null = null;
    let reservationsTimer: ReturnType<typeof setTimeout> | null = null;

    const invalidateStream = () => {
      if (streamTimer) clearTimeout(streamTimer);
      streamTimer = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["activeStream"] });
      }, DEBOUNCE_MS);
    };

    const invalidateStreamAndReservations = () => {
      invalidateStream();
      if (reservationsTimer) clearTimeout(reservationsTimer);
      reservationsTimer = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["myReservations"] });
      }, DEBOUNCE_MS);
    };

    const gameEvents = [
      "game:created",
      "game:status_changed",
      "game:updated",
      "games:batch_changed",
      "stream:started",
      "stream:ended",
    ];
    const offs = gameEvents.map((evt) => wsManager.on(evt, invalidateStream));

    const reservationEvents = [
      "slot:availability_changed",
      "reservation:confirmed",
      "reservation:cancelled",
      "reservation:status_changed",
    ];
    const resOffs = reservationEvents.map((evt) =>
      wsManager.on(evt, invalidateStreamAndReservations),
    );

    return () => {
      offs.forEach((off) => off());
      resOffs.forEach((off) => off());
      if (streamTimer) clearTimeout(streamTimer);
      if (reservationsTimer) clearTimeout(reservationsTimer);
    };
  }, [queryClient]);

  const toggleFilter = (key: keyof GameStatusFilter) => {
    setFilter((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const filterChips = [
    { key: "includeCreated" as const, label: "Upcoming" },
    { key: "includeOpen" as const, label: "Open" },
    { key: "includeInProgress" as const, label: "In Progress" },
    { key: "includeFinished" as const, label: "Finished" },
  ];

  const showGoldBanner = user && isGold(user);

  return (
    <div className="page-dark flex flex-col h-full">
      {/* Page title */}
      <PageHeader label="Games" icon={GiCrossedSwords} />

      {/* Gold Member banner */}
      {showGoldBanner && <GoldMemberBanner />}

      {/* Filter chips */}
      <div className="px-3 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
        {filterChips.map(({ key, label }) => {
          const isActive = filter[key];
          return (
            <button
              key={key}
              onClick={() => toggleFilter(key)}
              className={cn(
                "flex-shrink-0 px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-transform active:scale-[0.97]",
                isActive ? "text-[#c9a84c]" : "text-[#7a7366]",
              )}
              style={{
                backgroundImage: "url('/frames/game-card-border.png')",
                backgroundSize: "100% 100%",
                backgroundRepeat: "no-repeat",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 pb-2">
        {isLoading && <Loading message="Loading games..." />}
        {error && <ErrorDisplay message={String(error)} onRetry={refetch} />}

        {!isLoading && !error && !activeStream && (
          <EmptyState message="No active stream" icon={Calendar} />
        )}

        {activeStream &&
          (() => {
            const isGoldUser = !!(user && isGold(user));
            const visibleGames = (activeStream.games ?? []).filter(
              (game: Game) => !game.isExclusiveToGold || isGoldUser,
            );
            if (visibleGames.length === 0) {
              return (
                <EmptyState
                  message="No games in active stream"
                  icon={Calendar}
                />
              );
            }
            const earliestStart = (activeStream.games ?? [])
              .map((g: Game) => g.scheduledStartTime)
              .filter(Boolean)
              .sort()[0];
            const isLive = activeStream.stream.status === "LIVE";
            const liveUrl = activeStream.stream.url;
            return (
              <div>
                <div className="px-1 pt-2 pb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#8a8a8a] leading-none mb-1">
                      Current Stream
                    </p>
                    <p className="text-base font-bold text-[#c9a84c] leading-tight">
                      {activeStream.stream.title ||
                        activeStream.stream.scheduleName}
                    </p>
                  </div>
                  {isLive && liveUrl ? (
                    <a
                      href={liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#9c3e3b] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#b8524e] active:scale-[0.97] transition-all"
                    >
                      Join Live ↗
                    </a>
                  ) : (
                    earliestStart && (
                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8a8a8a] leading-none mb-1">
                          Estimated Start Time
                        </p>
                        <p className="text-xs font-bold leading-tight text-[#c9a84c]">
                          {formatTime(earliestStart)}
                        </p>
                      </div>
                    )
                  )}
                </div>
                {visibleGames.map((game: Game) => {
                  const ownReservation = activeReservations.find(
                    (r) => r.gameId === game.id,
                  );
                  return (
                    <GameCard
                      key={game.id}
                      game={game}
                      hasActiveReservation={!!ownReservation}
                      isLocked={game.status === "CREATED" && !isGoldUser}
                      onTap={() => router.push(`/games/${game.id}`)}
                    />
                  );
                })}
              </div>
            );
          })()}
      </div>
    </div>
  );
}
