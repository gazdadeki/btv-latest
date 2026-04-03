"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { toastError } from "@/lib/utils";
import { Dialog } from "@/components/dialog";
import { Button } from "@/components/button";
import type { Stream } from "@/types";

interface StartStreamDialogProps {
  open: boolean;
  stream: Stream;
  onClose: () => void;
  onStarted: () => void;
}

export function StartStreamDialog({
  open,
  stream,
  onClose,
  onStarted,
}: StartStreamDialogProps) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle("");
      setUrl("");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    try {
      await api.startStream(stream.id, {
        title: title.trim() || undefined,
        url: url.trim(),
      });
      toast.success("Stream started");
      setTitle("");
      setUrl("");
      onStarted();
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Start Stream">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Let's GO - dd.mm.yyyy"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            maxLength={255}
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Stream URL <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            maxLength={500}
          />
        </div>
        <div className="text-xs text-gray-500">
          Schedule: {stream.schedule?.name || `#${stream.scheduleId}`}
          {" · "}
          {stream.games?.length ?? 0} game
          {(stream.games?.length ?? 0) !== 1 ? "s" : ""}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button
            variant="success"
            type="submit"
            disabled={loading || !url.trim()}
          >
            {loading ? "Starting..." : "Go Live"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
