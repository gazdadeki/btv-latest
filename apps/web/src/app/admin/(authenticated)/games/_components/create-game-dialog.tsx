"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { toastError } from "@/lib/utils";
import { Dialog } from "@/components/dialog";
import { Button } from "@/components/button";

interface CreateGameDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateGameDialog({
  open,
  onClose,
  onCreated,
}: CreateGameDialogProps) {
  const [form, setForm] = useState({
    startTime: "",
    isExclusiveToGold: false,
  });

  const handleCreate = async () => {
    if (!form.startTime) {
      toast.error("Start time is required");
      return;
    }
    try {
      await api.createGame({
        scheduledStartTime: new Date(form.startTime).toISOString(),
        isExclusiveToGold: form.isExclusiveToGold,
      });
      toast.success("Game added to active stream");
      setForm({ startTime: "", isExclusiveToGold: false });
      onClose();
      onCreated();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Add Game to Stream">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          The game will be added to the currently active stream.
        </p>
        <div>
          <label className="block text-sm font-medium mb-1">
            Scheduled Start Time *
          </label>
          <input
            type="datetime-local"
            value={form.startTime}
            onChange={(e) => setForm({ ...form, startTime: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isExclusiveToGold}
            onChange={(e) =>
              setForm({ ...form, isExclusiveToGold: e.target.checked })
            }
            className="rounded"
          />
          Exclusive to Gold Subscribers
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>Add Game</Button>
        </div>
      </div>
    </Dialog>
  );
}
