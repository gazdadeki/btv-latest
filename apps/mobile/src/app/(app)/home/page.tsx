"use client";

// Home page: Gold Member banner, filter chips, games feed
// Dark gaming aesthetic

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar } from "lucide-react";
import { RiShieldStarFill, RiVipCrownFill } from "react-icons/ri";
import { api } from "@/lib/api";
import { wsManager } from "@/lib/websocket";
import { useAuth } from "@/lib/auth-context";
import { Loading } from "@/components/loading";
import { EmptyState } from "@/components/empty-state";
import { ErrorDisplay } from "@/components/error-display";
import { cn } from "@/lib/utils";
import type { Game, GameStatusFilter } from "@/types";
import { isGold, reservationIsActive, availableSlotsCount } from "@/types";

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
  onTap,
}: {
  game: Game;
  hasActiveReservation: boolean;
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
        "game-card w-full text-left px-4 py-4 mb-2",
        game.isExclusiveToGold && "game-card--gold",
      )}
    >
      <div className="flex items-center justify-between">
        {/* Left: game title */}
        <div className="flex items-center gap-2">
          {game.isExclusiveToGold && (
            <RiVipCrownFill className="w-4 h-4 text-[#c9a84c] shrink-0" />
          )}
          <span className="text-sm font-bold text-[#f0f0f0]">
            Game {game.gameIndex ?? game.id}
          </span>
        </div>

        {/* Right: status-dependent content */}
        <div className="flex flex-col items-end gap-1">
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

  // Refresh games list on real-time game lifecycle events
  useEffect(() => {
    const gameEvents = [
      "game:created",
      "game:status_changed",
      "game:updated",
      "games:batch_changed",
      "stream:started",
      "stream:ended",
    ];
    const offs = gameEvents.map((evt) =>
      wsManager.on(evt, () => {
        queryClient.invalidateQueries({ queryKey: ["activeStream"] });
      }),
    );

    const reservationEvents = [
      "slot:availability_changed",
      "reservation:confirmed",
      "reservation:cancelled",
      "reservation:status_changed",
    ];
    const resOffs = reservationEvents.map((evt) =>
      wsManager.on(evt, () => {
        queryClient.invalidateQueries({ queryKey: ["activeStream"] });
        queryClient.invalidateQueries({ queryKey: ["myReservations"] });
      }),
    );

    return () => {
      offs.forEach((off) => off());
      resOffs.forEach((off) => off());
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
                "flex-shrink-0 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all",
                isActive
                  ? "border-[#2a9d8f] text-[#2a9d8f] bg-[#2a9d8f]/10"
                  : "border-[#3a3a3a] text-[#6a6a6a] bg-transparent",
              )}
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

        {activeStream && (activeStream.games ?? []).length === 0 && (
          <EmptyState message="No games in active stream" icon={Calendar} />
        )}

        {activeStream && (activeStream.games ?? []).length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-[#f0f0f0] px-1 py-2">
              {activeStream.stream.title || activeStream.stream.scheduleName}
            </h2>
            {(activeStream.games ?? [])
              .filter(
                (game: Game) =>
                  !game.isExclusiveToGold || (user && isGold(user)),
              )
              .map((game: Game) => {
                const ownReservation = activeReservations.find(
                  (r) => r.gameId === game.id,
                );
                return (
                  <GameCard
                    key={game.id}
                    game={game}
                    hasActiveReservation={
                      !!ownReservation && ownReservation.gameId === game.id
                    }
                    onTap={() => router.push(`/games/${game.id}`)}
                  />
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
