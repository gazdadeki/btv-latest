"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { toastError } from "@/lib/utils";
import { webSocketManager } from "@/lib/websocket";
import { Button } from "@/components/button";
import type { Stream } from "@/types";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-50 border-yellow-300 text-yellow-800",
  LIVE: "bg-green-50 border-green-300 text-green-800",
};

const NO_STREAM_STYLE = "bg-gray-50 border-gray-200 text-gray-500";

export function StreamBanner({
  onStreamChange,
}: {
  onStreamChange?: () => void;
}) {
  const [stream, setStream] = useState<Stream | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.getActiveStream();
      setStream(res as Stream | null);
    } catch {
      setStream(null);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const events = [
      "games:batch_changed",
      "game:created",
      "game:status_changed",
    ];
    const unsubs = events.map((e) => webSocketManager.on(e, load));
    return () => unsubs.forEach((u) => u());
  }, [load]);

  const handleActivate = async () => {
    if (!stream) return;
    setLoading(true);
    try {
      await api.activateStream(stream.id);
      toast.success("Stream activated");
      await load();
      onStreamChange?.();
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnd = async () => {
    if (!stream) return;
    setLoading(true);
    try {
      await api.endStream(stream.id);
      toast.success("Stream ended");
      await load();
      onStreamChange?.();
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  // Still loading initial state
  if (stream === undefined) return null;

  if (!stream) {
    return (
      <div
        className={`rounded-lg border px-4 py-3 mb-4 text-sm ${NO_STREAM_STYLE}`}
      >
        No active stream
      </div>
    );
  }

  const style = STATUS_STYLES[stream.status] || NO_STREAM_STYLE;
  const gameCount = stream.games?.length ?? 0;

  return (
    <div
      className={`rounded-lg border px-4 py-3 mb-4 flex items-center justify-between ${style}`}
    >
      <div className="text-sm font-medium">
        Stream #{stream.id}
        <span className="ml-2 px-2 py-0.5 rounded text-xs font-semibold bg-white/60">
          {stream.status}
        </span>
        <span className="ml-2 text-sm font-normal">
          {stream.schedule?.name || `Schedule #${stream.scheduleId}`}
        </span>
        {gameCount > 0 && (
          <span className="ml-2 text-xs font-normal opacity-75">
            ({gameCount} game{gameCount !== 1 ? "s" : ""})
          </span>
        )}
      </div>
      <div className="flex gap-2">
        {stream.status === "PENDING" && (
          <Button
            variant="success"
            size="xs"
            onClick={handleActivate}
            disabled={loading}
          >
            Activate
          </Button>
        )}
        {(stream.status === "PENDING" || stream.status === "LIVE") && (
          <Button
            variant="danger"
            size="xs"
            onClick={handleEnd}
            disabled={loading}
          >
            End Stream
          </Button>
        )}
      </div>
    </div>
  );
}
