"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { toastError, localTimeToUtc } from "@/lib/utils";
import { Dialog } from "@/components/dialog";
import { Button } from "@/components/button";
import {
  FormRow,
  FormInput,
  FormSelect,
  FormCheckbox,
} from "@/components/form-fields";
import { REFUND_POLICIES } from "@/constants";
import type { SlotConfig } from "@/types";
import { RecurrenceForm } from "./recurrence-form";
import { SlotConfigEditor } from "./slot-config-editor";

function addHoursToTime(time: string, hours: number): string {
  const [h, m] = time.split(":").map(Number);
  const totalMinutes = (h * 60 + m + hours * 60) % (24 * 60);
  const newH = Math.floor(totalMinutes / 60);
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

function defaultCreate(): Record<string, unknown> {
  return {
    name: "",
    description: "",
    gameCreationTime: "12:00",
    reservationOpenTime: "16:00",
    firstGameStartTime: "20:00",
    scheduleStartDate: new Date().toISOString().split("T")[0],
    scheduleEndDate: "",
    gamesPerDay: 5,
    recurrenceType: "WEEKLY",
    recurrenceDays: [0, 1, 2, 3, 4, 5, 6],
    recurrenceMonth: 1,
    recurrenceDay: 1,
    onceDate: new Date().toISOString().split("T")[0],
    // Economy
    reservationCost: 0,
    refundPolicy: "FULL",
    refundPercentage: 0,
    isExclusiveToGold: false,
    // Confirmation (off by default)
    requiresConfirmation: false,
    confirmationWindowMinutes: 30,
    instantReservationCost: 0,
    reminderMinutes: "30,15",
  };
}

const SLOTS_PER_GAME = 10;

interface CreateScheduleDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateScheduleDialog({
  open,
  onClose,
  onCreated,
}: CreateScheduleDialogProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Record<string, unknown>>(defaultCreate());
  const [slots, setSlots] = useState<SlotConfig[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Auto-compute reservationOpenTime when gameCreationTime changes
  useEffect(() => {
    if (form.gameCreationTime && !form._openTimeManuallySet) {
      setForm((prev) => ({
        ...prev,
        reservationOpenTime: addHoursToTime(String(prev.gameCreationTime), 4),
      }));
    }
  }, [form.gameCreationTime]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open && step === 3) {
      const newSlots: SlotConfig[] = [];
      for (let i = 1; i <= SLOTS_PER_GAME; i++) {
        const existing = slots.find((s) => s.slotNumber === i);
        newSlots.push(
          existing || {
            slotNumber: i,
            team: i <= SLOTS_PER_GAME / 2 ? "A" : "B",
            isGoldOnly: i === 2 || i === 3,
            coinsCost: null,
            preAssignedUserId: null,
          },
        );
      }
      setSlots(newSlots.slice(0, SLOTS_PER_GAME));
    }
  }, [open, step]); // eslint-disable-line react-hooks/exhaustive-deps

  const recurrencePreview = useMemo(() => {
    const type = form.recurrenceType as string;
    const days = form.recurrenceDays as number[];
    if (type === "WEEKLY" && days?.length > 0)
      return `${days.length} game day(s) per week`;
    if (type === "MONTHLY") return "Selected days each month";
    if (type === "YEARLY") return "Once per year";
    if (type === "ONCE") return "Single event";
    return "";
  }, [form.recurrenceType, form.recurrenceDays]);

  const handleCreate = async () => {
    if (submitting) return;
    setSubmitting(true);
    const f = form;

    let recDays = f.recurrenceDays as number[];
    let recPattern = null;
    if (f.recurrenceType === "YEARLY") {
      recPattern = {
        month: Number(f.recurrenceMonth),
        day: Number(f.recurrenceDay),
      };
      recDays = [];
    }
    if (f.recurrenceType === "ONCE") {
      recDays = [];
      if (f.onceDate) {
        const [y, m, d] = (f.onceDate as string).split("-").map(Number);
        recPattern = { year: y, month: m, day: d };
      }
    }

    const requiresConfirmation = !!f.requiresConfirmation;
    const reminders = requiresConfirmation
      ? String(f.reminderMinutes || "")
          .split(",")
          .map(Number)
          .filter(Boolean)
      : null;

    const payload: Record<string, unknown> = {
      name: f.name || undefined,
      description: f.description || null,
      recurrenceType: f.recurrenceType,
      recurrenceDays: recDays.length > 0 ? recDays : null,
      recurrencePattern: recPattern,
      slotsPerGame: SLOTS_PER_GAME,
      reservationCost: Number(f.reservationCost),
      instantReservationCost: requiresConfirmation
        ? Number(f.instantReservationCost) || null
        : null,
      confirmationWindowMinutes: requiresConfirmation
        ? Number(f.confirmationWindowMinutes)
        : 0,
      requiresConfirmation,
      refundPolicy: f.refundPolicy,
      refundPercentage:
        f.refundPolicy === "PARTIAL" ? Number(f.refundPercentage) : null,
      isExclusiveToGold: !!f.isExclusiveToGold,
      firstGameStartTime: localTimeToUtc(f.firstGameStartTime as string),
      gameCreationTime: localTimeToUtc(
        (f.gameCreationTime as string) || "12:00",
      ),
      reservationOpenTime: localTimeToUtc(
        (f.reservationOpenTime as string) || "16:00",
      ),
      scheduleStartDate: (f.scheduleStartDate as string)?.trim() || null,
      scheduleEndDate: (f.scheduleEndDate as string)?.trim() || null,
      gamesPerDay: Number(f.gamesPerDay),
      reminderMinutesBefore: reminders?.length ? reminders : null,
      slotConfigs: slots,
    };

    try {
      await api.createSchedule(payload);
      toast.success("Schedule created");
      handleClose();
      onCreated();
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes("overlaps with active schedule")) {
        const confirmed = window.confirm(
          `${msg}\n\nDeactivate the overlapping schedule(s) and proceed?`,
        );
        if (confirmed) {
          try {
            await api.createSchedule({
              ...payload,
              forceDeactivateOverlapping: true,
            });
            toast.success(
              "Schedule created (overlapping schedule deactivated)",
            );
            handleClose();
            onCreated();
          } catch (retryErr) {
            toastError(retryErr);
          }
        }
      } else {
        toastError(err);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setForm(defaultCreate());
    setSlots([]);
    setStep(1);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={`Create Schedule - Step ${step} of 3`}
      className="max-w-2xl"
    >
      <div className="flex items-center gap-2 mb-4">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`flex-1 h-1.5 rounded ${s <= step ? "bg-indigo-600" : "bg-gray-200"}`}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-3">
          <FormRow label="Name (optional)">
            <FormInput
              form={form}
              field="name"
              setForm={setForm}
              placeholder="Auto-generated if empty"
            />
          </FormRow>
          <FormRow label="Description">
            <FormInput form={form} field="description" setForm={setForm} />
          </FormRow>
          <div className="grid grid-cols-2 gap-3">
            <FormRow
              label="Game Creation Time"
              title="Time at which games are auto-generated (your local time)"
            >
              <input
                type="time"
                value={String(form.gameCreationTime || "")}
                onChange={(e) =>
                  setForm({
                    ...form,
                    gameCreationTime: e.target.value,
                    _openTimeManuallySet: false,
                  })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </FormRow>
            <FormRow
              label="Reservation Open Time"
              title="Time when all users can reserve (default: creation + 4h)"
            >
              <input
                type="time"
                value={String(form.reservationOpenTime || "")}
                onChange={(e) =>
                  setForm({
                    ...form,
                    reservationOpenTime: e.target.value,
                    _openTimeManuallySet: true,
                  })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </FormRow>
            <FormRow
              label="Estimated Stream Start"
              title="Approximate time the streamer goes live (informational)"
            >
              <input
                type="time"
                value={String(form.firstGameStartTime || "")}
                onChange={(e) =>
                  setForm({ ...form, firstGameStartTime: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </FormRow>
            <FormRow label="Games Per Day">
              <FormInput
                form={form}
                field="gamesPerDay"
                setForm={setForm}
                type="number"
              />
            </FormRow>
            <FormRow
              label="Schedule Start Date"
              title="First day games may be generated (optional)"
            >
              <input
                type="date"
                value={String(form.scheduleStartDate || "")}
                onChange={(e) =>
                  setForm({ ...form, scheduleStartDate: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </FormRow>
            <FormRow
              label="Schedule End Date"
              title="Last day games may be generated (optional)"
            >
              <input
                type="date"
                value={String(form.scheduleEndDate || "")}
                onChange={(e) =>
                  setForm({ ...form, scheduleEndDate: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </FormRow>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => setStep(2)}>Next: Recurrence</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <RecurrenceForm form={form} setForm={setForm} />
          {recurrencePreview && (
            <div className="p-3 bg-indigo-50 text-indigo-800 rounded text-sm">
              {recurrencePreview}
            </div>
          )}
          <div className="flex justify-between pt-2">
            <Button variant="secondary" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button onClick={() => setStep(3)}>Next: Economy & Slots</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Economy</h3>
          <div className="grid grid-cols-2 gap-3">
            <FormRow label="Reservation Cost">
              <FormInput
                form={form}
                field="reservationCost"
                setForm={setForm}
                type="number"
              />
            </FormRow>
            <FormRow label="Refund Policy">
              <FormSelect
                form={form}
                field="refundPolicy"
                setForm={setForm}
                options={REFUND_POLICIES}
              />
            </FormRow>
          </div>
          {form.refundPolicy === "PARTIAL" && (
            <FormRow label="Refund %">
              <FormInput
                form={form}
                field="refundPercentage"
                setForm={setForm}
                type="number"
              />
            </FormRow>
          )}
          <FormCheckbox
            form={form}
            field="isExclusiveToGold"
            setForm={setForm}
            label="Exclusive to Gold Subscribers"
          />

          <div className="border-t pt-3 mt-3">
            <FormCheckbox
              form={form}
              field="requiresConfirmation"
              setForm={setForm}
              label="Require reservation confirmation"
            />
            {form.requiresConfirmation && (
              <div className="grid grid-cols-2 gap-3 mt-3 pl-4 border-l-2 border-indigo-200">
                <FormRow label="Confirm Window (min)">
                  <FormInput
                    form={form}
                    field="confirmationWindowMinutes"
                    setForm={setForm}
                    type="number"
                  />
                </FormRow>
                <FormRow label="Instant Reserve Cost">
                  <FormInput
                    form={form}
                    field="instantReservationCost"
                    setForm={setForm}
                    type="number"
                  />
                </FormRow>
                <FormRow label="Reminder Minutes">
                  <FormInput
                    form={form}
                    field="reminderMinutes"
                    setForm={setForm}
                    placeholder="30,15"
                  />
                </FormRow>
              </div>
            )}
          </div>

          <h3 className="text-sm font-semibold text-gray-700 pt-2">
            Slot Configuration ({SLOTS_PER_GAME} slots)
          </h3>
          <SlotConfigEditor slots={slots} setSlots={setSlots} />

          <div className="flex justify-between pt-2">
            <Button variant="secondary" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button
              variant="success"
              onClick={handleCreate}
              disabled={submitting}
            >
              {submitting ? "Creating..." : "Create Schedule"}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
