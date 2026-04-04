"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { toastError } from "@/lib/utils";
import { Dialog } from "@/components/dialog";
import { Button } from "@/components/button";
import { SlotConfigEditor } from "../../schedules/_components/slot-config-editor";
import type { SlotConfig, Stream } from "@/types";

interface CreateGameDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const SLOTS_PER_GAME = 10;

function buildDefaultSlots(): SlotConfig[] {
  const slotsPerTeam = SLOTS_PER_GAME / 2;
  const slots: SlotConfig[] = [];
  for (let i = 1; i <= slotsPerTeam; i++) {
    slots.push({ slotNumber: i, team: "A", isGoldOnly: i === 2 || i === 3 });
  }
  for (let i = 1; i <= slotsPerTeam; i++) {
    slots.push({ slotNumber: slotsPerTeam + i, team: "B", isGoldOnly: false });
  }
  return slots;
}

export function CreateGameDialog({
  open,
  onClose,
  onCreated,
}: CreateGameDialogProps) {
  const [step, setStep] = useState(1);
  const [isExclusiveToGold, setIsExclusiveToGold] = useState(false);
  const [allowMultipleReservations, setAllowMultipleReservations] =
    useState(false);
  const [slots, setSlots] = useState<SlotConfig[]>(buildDefaultSlots);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setIsExclusiveToGold(false);
    setAllowMultipleReservations(false);
    setSubmitting(false);

    // Load slot configs from the active stream's schedule
    (async () => {
      try {
        const stream = (await api.getActiveStream()) as Stream | null;
        if (!stream?.scheduleId) {
          setSlots(buildDefaultSlots());
          return;
        }
        const schedule = (await api.getSchedule(stream.scheduleId)) as {
          slotConfigs?: (SlotConfig & {
            preAssignedUser?: { username: string } | null;
          })[];
        };
        if (schedule?.slotConfigs?.length) {
          setSlots(
            schedule.slotConfigs.map((c) => ({
              slotNumber: c.slotNumber,
              team: c.team,
              isGoldOnly: c.isGoldOnly,
              coinsCost: c.coinsCost,
              preAssignedUserId: c.preAssignedUserId,
              preAssignedUsername: c.preAssignedUser?.username ?? null,
            })),
          );
        } else {
          setSlots(buildDefaultSlots());
        }
      } catch {
        setSlots(buildDefaultSlots());
      }
    })();
  }, [open]);

  const handleCreate = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await api.createGame({
        isExclusiveToGold,
        allowMultipleReservations,
        slotConfigs: slots,
      });
      toast.success("Game added to active stream");
      onClose();
      onCreated();
    } catch (err) {
      toastError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Add Game - Step ${step} of 2`}
      className={step === 2 ? "max-w-2xl" : undefined}
    >
      <div className="flex items-center gap-2 mb-4">
        {[1, 2].map((s) => (
          <div
            key={s}
            className={`flex-1 h-1.5 rounded ${s <= step ? "bg-indigo-600" : "bg-gray-200"}`}
          />
        ))}
      </div>
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            The game will be added to the currently active stream.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isExclusiveToGold}
              onChange={(e) => setIsExclusiveToGold(e.target.checked)}
              className="rounded"
            />
            Exclusive to Gold Subscribers
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allowMultipleReservations}
              onChange={(e) => setAllowMultipleReservations(e.target.checked)}
              className="rounded"
            />
            Allow unrestricted reservations
          </label>
          <div className="flex justify-between pt-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => setStep(2)}>Next: Slot Config</Button>
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-4">
          <SlotConfigEditor slots={slots} setSlots={setSlots} />
          <div className="flex justify-between pt-2">
            <Button variant="secondary" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? "Adding..." : "Add Game"}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
