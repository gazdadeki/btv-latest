"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createColumnHelper } from "@tanstack/react-table";
import { api } from "@/lib/api";
import { formatDate, toastError } from "@/lib/utils";
import { webSocketManager } from "@/lib/websocket";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { PageLoading } from "@/components/loading";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/button";
import { ScrollableSelect } from "@/components/scrollable-select";
import { StatusBadge } from "@/components/status-badge";
import { useConfirmAction } from "@/hooks/use-confirm-action";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { GAME_STATUS_COLORS } from "@/constants";
import type { Game, Stream } from "@/types";
import { CreateGameDialog } from "./_components/create-game-dialog";
import { FinishGameDialog } from "./_components/finish-game-dialog";
import { GameDetailDialog } from "./_components/game-detail-dialog";

interface StreamOption {
  id: number;
  title: string | null;
  status: string;
}

const columnHelper = createColumnHelper<Game>();

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isFetching, setIsFetching] = useState(false);
  const [streams, setStreams] = useState<StreamOption[]>([]);
  const [streamSearch, setStreamSearch] = useState("");
  const debouncedStreamSearch = useDebouncedValue(streamSearch, 300);
  const [streamsLoading, setStreamsLoading] = useState(false);
  const streamLabelCache = useRef<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [activeStreamId, setActiveStreamId] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterStream, setFilterStream] = useState<string | null>(null);
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [detailGame, setDetailGame] = useState<Game | null>(null);
  const [finishGame, setFinishGame] = useState<Game | null>(null);
  const { confirmAction, confirm, reset } = useConfirmAction();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setPage(1);
  }, [filterStatus, filterStream, filterStartDate, filterEndDate]);

  const load = useCallback(async () => {
    if (filterStream === null) return; // wait until stream filter is initialized
    setIsFetching(true);
    try {
      const params: Record<string, string | undefined> = {
        page: String(page),
        limit: String(pageSize),
      };
      if (filterStatus) params.status = filterStatus;
      if (filterStream) params.streamId = filterStream;
      if (filterStartDate) params.startDate = filterStartDate;
      if (filterEndDate) params.endDate = filterEndDate;
      const res = (await api.getGames(params)) as {
        data: Game[];
        total: number;
      };
      setGames(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      toastError(err, "Failed to load games");
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  }, [
    filterStatus,
    filterStream,
    filterStartDate,
    filterEndDate,
    page,
    pageSize,
  ]);

  const cacheStreamLabels = useCallback((list: StreamOption[]) => {
    for (const s of list) {
      if (s.title) streamLabelCache.current.set(String(s.id), s.title);
    }
  }, []);

  // Load streams list and set the active stream as default filter
  useEffect(() => {
    (async () => {
      try {
        const [streamsRes, active] = await Promise.all([
          api.getStreams({ limit: "20" }) as Promise<{
            data: StreamOption[];
          }>,
          api.getActiveStream() as Promise<Stream | null>,
        ]);
        const list = streamsRes?.data ?? [];
        setStreams(list);
        cacheStreamLabels(list);
        const id = active?.id ? String(active.id) : "";
        if (id && active?.title) streamLabelCache.current.set(id, active.title);
        setActiveStreamId(id);
        setFilterStream(id);
      } catch {
        setFilterStream("");
      }
    })();
  }, [cacheStreamLabels]);

  useEffect(() => {
    load();
  }, [load]);

  const loadStreams = useCallback(
    async (search?: string) => {
      setStreamsLoading(true);
      try {
        const params: Record<string, string | undefined> = { limit: "20" };
        if (search) params.search = search;
        const res = (await api.getStreams(params)) as {
          data?: StreamOption[];
        };
        const list = res?.data ?? [];
        setStreams(list);
        cacheStreamLabels(list);
      } catch {
        /* ignore */
      } finally {
        setStreamsLoading(false);
      }
    },
    [cacheStreamLabels],
  );

  // Refetch streams whenever the debounced search changes (after initial mount)
  const didMountStreamSearch = useRef(false);
  useEffect(() => {
    if (!didMountStreamSearch.current) {
      didMountStreamSearch.current = true;
      return;
    }
    loadStreams(debouncedStreamSearch);
  }, [debouncedStreamSearch, loadStreams]);

  const loadGameDetail = async (id: number) => {
    try {
      const res = (await api.getGame(id)) as Game;
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
      "game:created",
      "game:updated",
      "game:status_changed",
      "game:started",
      "game:finished",
    ];
    const slotEvents = [
      "slot:availability_changed",
      "reservation:created",
      "reservation:confirmed",
      "reservation:cancelled",
      "game:players_shuffled",
    ];
    const unsubs: (() => void)[] = [];
    for (const e of gameEvents)
      unsubs.push(webSocketManager.on(e, debouncedRefresh));
    for (const e of slotEvents) {
      unsubs.push(
        webSocketManager.on(e, (...args: unknown[]) => {
          debouncedRefresh();
          const data = args[0] as { gameId?: number } | undefined;
          if (data?.gameId && detailGame?.id === data.gameId) {
            loadGameDetail(data.gameId);
          }
        }),
      );
    }
    unsubs.push(
      webSocketManager.on("games:batch_changed", () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        load();
      }),
    );
    unsubs.push(
      webSocketManager.on("stream:changed", () => {
        load();
        loadStreams();
      }),
    );
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      unsubs.forEach((u) => u());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, loadStreams, detailGame?.id]);

  const handleStart = (id: number) => {
    confirm({
      title: "Start Game",
      message: "Are you sure you want to start this game?",
      onConfirm: async () => {
        try {
          await api.startGame(id);
          toast.success("Game started");
          load();
          reset();
        } catch (err) {
          toastError(err);
          reset();
        }
      },
    });
  };

  const handleRemake = (id: number) => {
    confirm({
      title: "Remake Game",
      message:
        "Reset this game back to OPEN? All reservations will be kept. You can start it again when ready.",
      onConfirm: async () => {
        try {
          await api.remakeGame(id);
          toast.success("Game remade — back to OPEN");
          load();
          reset();
        } catch (err) {
          toastError(err);
          reset();
        }
      },
    });
  };

  const handleCancel = (id: number) => {
    confirm({
      title: "Cancel Game",
      message: "Cancel this game? This will mark it as cancelled.",
      variant: "danger",
      onConfirm: async () => {
        try {
          await api.cancelGame(id);
          toast.success("Game cancelled");
          load();
          reset();
        } catch (err) {
          toastError(err);
          reset();
        }
      },
    });
  };

  const handleCancelAll = () => {
    confirm({
      title: "Cancel All Active Games",
      message:
        "Cancel all active games (CREATED and IN_PROGRESS)? This cannot be undone.",
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await api.cancelAllActiveGames();
          toast.success(`${res.cancelledCount} game(s) cancelled`);
          load();
          reset();
        } catch (err) {
          toastError(err);
          reset();
        }
      },
    });
  };

  const openFinish = async (id: number) => {
    try {
      const game = (await api.getGame(id)) as Game;
      setFinishGame(game);
    } catch (err) {
      toastError(err);
    }
  };

  const handleDetailMutated = () => {
    load();
  };

  const columns = [
    columnHelper.accessor("id", {
      header: "Game",
      cell: (i) => {
        const g = i.row.original;
        return `Game ${g.gameIndex ?? g.id}`;
      },
    }),
    columnHelper.display({
      id: "stream",
      header: "Stream",
      cell: (i) => (
        <span className="block">{i.row.original.stream?.title || "—"}</span>
      ),
    }),
    columnHelper.display({
      id: "started",
      header: "Started",
      cell: (i) => {
        const g = i.row.original;
        return g.actualStartTime ? formatDate(g.actualStartTime) : "—";
      },
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: (i) => (
        <StatusBadge status={i.getValue()} colorMap={GAME_STATUS_COLORS} />
      ),
    }),
    columnHelper.display({
      id: "slots",
      header: "Slots",
      cell: (i) => {
        const g = i.row.original;
        const total = g.slots?.length ?? g.totalSlots ?? "?";
        const reserved =
          g.slotsReserved ?? g.slots?.filter((s) => s.isReserved).length ?? 0;
        return `${reserved}/${total}`;
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: (i) => {
        const g = i.row.original;
        const canModify =
          g.status === "CREATED" ||
          g.status === "OPEN" ||
          g.status === "IN_PROGRESS";
        return (
          <div className="flex gap-1">
            <Button
              variant="primary"
              size="xs"
              onClick={() => loadGameDetail(g.id)}
              title="View"
            >
              <i className="fas fa-eye" />
            </Button>
            {(g.status === "CREATED" || g.status === "OPEN") && (
              <Button
                variant="success"
                size="xs"
                onClick={() => handleStart(g.id)}
                title="Start"
              >
                <i className="fas fa-play" />
              </Button>
            )}
            {g.status === "IN_PROGRESS" && (
              <>
                <Button
                  variant="orange"
                  size="xs"
                  onClick={() => openFinish(g.id)}
                  title="Finish"
                >
                  <i className="fas fa-stop" />
                </Button>
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => handleRemake(g.id)}
                  title="Remake"
                >
                  <i className="fas fa-redo" />
                </Button>
              </>
            )}
            {canModify && (
              <Button
                variant="danger"
                size="xs"
                onClick={() => handleCancel(g.id)}
                title="Cancel"
              >
                <i className="fas fa-times" />
              </Button>
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
            <Button
              variant="primary"
              size="lg"
              onClick={() => setShowCreate(true)}
            >
              New Game
            </Button>
          </div>
        }
      />

      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Stream</label>
            <ScrollableSelect
              value={filterStream ?? ""}
              onChange={(v) => {
                setFilterStream(v);
                setStreamSearch("");
              }}
              options={(() => {
                const opts = [
                  { value: "", label: "All Streams" },
                  ...streams.map((s) => ({
                    value: String(s.id),
                    label: s.title || `Stream #${s.id}`,
                  })),
                ];
                // Preserve the selected stream's label even if the current search
                // results don't include it.
                if (
                  filterStream &&
                  !opts.some((o) => o.value === filterStream)
                ) {
                  const cached = streamLabelCache.current.get(filterStream);
                  opts.splice(1, 0, {
                    value: filterStream,
                    label: cached || `Stream #${filterStream}`,
                  });
                }
                return opts;
              })()}
              placeholder="All Streams"
              className="w-56"
              maxVisibleItems={8}
              searchable
              searchValue={streamSearch}
              onSearchChange={setStreamSearch}
              searchPlaceholder="Search streams…"
              isLoading={streamsLoading}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All Statuses</option>
              <option value="CREATED">Created</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="FINISHED">Finished</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => {
              setFilterStatus("");
              setFilterStream(activeStreamId);
              setFilterStartDate("");
              setFilterEndDate("");
            }}
          >
            Clear
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <DataTable
          columns={columns}
          data={games}
          hideSearch
          server={{
            page,
            pageSize,
            total,
            onPageChange: setPage,
            onPageSizeChange: (size) => {
              setPageSize(size);
              setPage(1);
            },
            isLoading: isFetching,
          }}
        />
      </div>

      <CreateGameDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
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
        onFinished={load}
      />

      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction?.title || ""}
        message={confirmAction?.message || ""}
        variant={confirmAction?.variant}
        onConfirm={() => confirmAction?.onConfirm()}
        onCancel={reset}
      />
    </div>
  );
}
