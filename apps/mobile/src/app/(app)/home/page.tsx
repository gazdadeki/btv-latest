"use client";

// Translated from Mobile/lib/features/home/pages/home_page.dart
// Features: filter chips, filter bottom sheet, games history section, schedule sections

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Filter,
  Calendar,
  Play,
  CheckCircle,
  XCircle,
  ChevronDown,
} from "lucide-react";
import { api } from "@/lib/api";
import { wsManager } from "@/lib/websocket";
import { useAuth } from "@/lib/auth-context";
import { Loading } from "@/components/loading";
import { EmptyState } from "@/components/empty-state";
import { ErrorDisplay } from "@/components/error-display";
import { Button } from "@/components/button";
import { cn } from "@/lib/utils";
import type { Game, GameStatusFilter, ActiveStream } from "@/types";
import {
  GAME_STATUS_DISPLAY,
  reservationIsActive,
  availableSlotsCount,
} from "@/types";

const DEFAULT_FILTER: GameStatusFilter = {
  includeCreated: true,
  includeOpen: true,
  includeInProgress: true,
  includeFinished: true,
  includeCancelled: false,
};

const STATUS_CONFIG = {
  CREATED: { label: "Upcoming", color: "green", icon: Calendar },
  OPEN: { label: "Open", color: "green", icon: Calendar },
  IN_PROGRESS: { label: "In Progress", color: "orange", icon: Play },
  FINISHED: { label: "Finished", color: "gray", icon: CheckCircle },
  CANCELLED: { label: "Cancelled", color: "red", icon: XCircle },
} as const;

const CHIP_COLORS: Record<string, string> = {
  green: "border-green-500 text-green-700 bg-green-50",
  orange: "border-orange-500 text-orange-700 bg-orange-50",
  gray: "border-gray-400 text-gray-600 bg-gray-100",
  red: "border-red-500 text-red-700 bg-red-50",
};

const TOGGLE_BG: Record<string, string> = {
  green: "bg-green-500",
  orange: "bg-orange-500",
  gray: "bg-gray-500",
  red: "bg-red-500",
};

function GameCard({
  game,
  hasActiveReservation,
  onTap,
}: {
  game: Game;
  hasActiveReservation: boolean;
  onTap: () => void;
}) {
  const cfg = STATUS_CONFIG[game.status];
  const Icon = cfg.icon;
  const colorClass = CHIP_COLORS[cfg.color];

  return (
    <button
      onClick={onTap}
      className="w-full text-left bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-2 active:scale-[0.98] transition-transform"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg font-bold text-gray-900">
          Game {game.gameIndex ?? game.id}
        </span>
        <span
          className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border",
            colorClass,
          )}
        >
          <Icon className="w-3 h-3" />
          {cfg.label}
        </span>
      </div>
      <div className="flex items-center gap-1 text-sm text-gray-500">
        <span>
          {availableSlotsCount(game)} / {game.slots.length} slots available
        </span>
      </div>
      {game.isExclusiveToGold && (
        <div className="mt-2 flex items-center gap-1">
          <span className="text-xs font-bold text-amber-600">
            ★ Gold Exclusive
          </span>
        </div>
      )}
      {hasActiveReservation && (
        <div className="mt-2 bg-blue-50 border border-blue-200 rounded p-2 flex items-center gap-2">
          <span className="text-xs text-blue-700">
            You have an active reservation
          </span>
        </div>
      )}
    </button>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<GameStatusFilter>(DEFAULT_FILTER);
  const [showFilterSheet, setShowFilterSheet] = useState(false);

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
  const hasActiveReservation = activeReservations.length > 0;

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

    // Refresh reservations on slot/reservation changes (e.g. admin kick)
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
    { key: "includeCreated" as const, label: "Upcoming", color: "green" },
    { key: "includeOpen" as const, label: "Open", color: "green" },
    {
      key: "includeInProgress" as const,
      label: "In Progress",
      color: "orange",
    },
    { key: "includeFinished" as const, label: "Finished", color: "gray" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Today&apos;s Games</h1>
        <button
          onClick={() => setShowFilterSheet(true)}
          className="p-2 text-gray-500 hover:text-gray-700"
        >
          <Filter className="w-5 h-5" />
        </button>
      </div>

      {/* Filter chips */}
      <div className="bg-white border-b border-gray-100 px-2 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
        {filterChips.map(({ key, label, color }) => {
          const isActive = filter[key];
          const colorStyles = CHIP_COLORS[color];
          return (
            <button
              key={key}
              onClick={() => toggleFilter(key)}
              className={cn(
                "flex-shrink-0 px-3 py-1 rounded-full border text-xs font-medium transition-all",
                isActive
                  ? colorStyles
                  : "border-gray-200 text-gray-400 bg-transparent",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {isLoading && <Loading message="Loading games..." />}
        {error && <ErrorDisplay message={String(error)} onRetry={refetch} />}

        {!isLoading && !error && !activeStream && (
          <EmptyState message="No active stream" icon={Calendar} />
        )}

        {activeStream && (activeStream.games ?? []).length === 0 && (
          <EmptyState message="No games in active stream" icon={Calendar} />
        )}

        {activeStream && (activeStream.games ?? []).length > 0 && (
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-800 px-2 py-2">
              {activeStream.stream.title || activeStream.stream.scheduleName}
            </h2>
            {(activeStream.games ?? []).map((game: Game) => {
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

      {/* Filter bottom sheet */}
      {showFilterSheet && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          onClick={() => setShowFilterSheet(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-white w-full max-w-lg mx-auto rounded-t-2xl p-4 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Filter Games</h2>
              <button
                onClick={() => setFilter(DEFAULT_FILTER)}
                className="text-sm text-indigo-600"
              >
                Reset
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-3">Show games by status:</p>
            <div className="flex flex-col gap-2 mb-6">
              {filterChips.map(({ key, label, color }) => (
                <div
                  key={key}
                  className="flex items-center justify-between py-2"
                >
                  <span className="text-sm font-medium text-gray-800">
                    {label}
                  </span>
                  <button
                    onClick={() => toggleFilter(key)}
                    className={cn(
                      "w-11 h-6 rounded-full transition-colors relative",
                      filter[key] ? TOGGLE_BG[color] : "bg-gray-200",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                        filter[key] ? "translate-x-5" : "translate-x-0.5",
                      )}
                    />
                  </button>
                </div>
              ))}
            </div>
            <Button size="full" onClick={() => setShowFilterSheet(false)}>
              Apply Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
