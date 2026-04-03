"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { toastError } from "@/lib/utils";
import { webSocketManager } from "@/lib/websocket";
import { Button } from "@/components/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { StartStreamDialog } from "@/components/start-stream-dialog";
import type { Stream } from "@/types";

export function StreamControl() {
  const [stream, setStream] = useState<Stream | null | undefined>(undefined);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.getActiveStream();
      setStream((res as Stream) || null);
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
      "stream:changed",
    ];
    const unsubs = events.map((e) => webSocketManager.on(e, load));
    return () => unsubs.forEach((u) => u());
  }, [load]);

  const handleEnd = async () => {
    if (!stream) return;
    setLoading(true);
    try {
      await api.endStream(stream.id);
      toast.success("Stream ended");
      setShowEndConfirm(false);
      await load();
      webSocketManager.emitLocal("stream:changed");
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  // Still loading
  if (stream === undefined) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <i className="fas fa-circle-notch fa-spin" />
      </div>
    );
  }

  // No active stream
  if (!stream) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <span className="inline-block w-2 h-2 rounded-full bg-gray-300" />
        No active stream
      </div>
    );
  }

  // PENDING — show Start Stream button
  if (stream.status === "PENDING") {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-yellow-700">
          <span className="inline-block w-2 h-2 rounded-full bg-yellow-500" />
          Stream ready
        </div>
        <Button
          variant="success"
          size="sm"
          onClick={() => setShowStartDialog(true)}
        >
          <i className="fas fa-play mr-1.5" />
          Start Stream
        </Button>
        <StartStreamDialog
          open={showStartDialog}
          stream={stream}
          onClose={() => setShowStartDialog(false)}
          onStarted={() => {
            setShowStartDialog(false);
            load();
            webSocketManager.emitLocal("stream:changed");
          }}
        />
      </div>
    );
  }

  // LIVE — show End Stream button
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-sm text-green-700">
        <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="font-medium">LIVE</span>
        {stream.title && (
          <span className="text-gray-500 font-normal">· {stream.title}</span>
        )}
      </div>
      <Button
        variant="danger"
        size="sm"
        onClick={() => setShowEndConfirm(true)}
        disabled={loading}
      >
        <i className="fas fa-stop mr-1.5" />
        End Stream
      </Button>
      <ConfirmDialog
        open={showEndConfirm}
        title="End Stream"
        message="Are you sure you want to end this stream? This action cannot be undone."
        confirmLabel="End Stream"
        variant="danger"
        onConfirm={handleEnd}
        onCancel={() => setShowEndConfirm(false)}
      />
    </div>
  );
}
