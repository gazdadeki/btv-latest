"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  formatDate,
  toastError,
  utcTimeToLocal,
  localTimeToUtc,
} from "@/lib/utils";
import { Dialog } from "@/components/dialog";
import { Button } from "@/components/button";
import { Tabs } from "@/components/tabs";
import { StatusBadge } from "@/components/status-badge";
import {
  FormRow,
  FormInput,
  FormSelect,
  FormCheckbox,
} from "@/components/form-fields";
import {
  REFUND_POLICIES,
  WEEKDAYS,
  GAME_STATUS_COLORS,
  teamDisplay,
} from "@/constants";
import type { Schedule, SlotConfig } from "@/types";
import { RecurrenceForm } from "./recurrence-form";
import { SlotConfigEditor } from "./slot-config-editor";

interface ScheduleDetailDialogProps {
  schedule: Schedule | null;
  onClose: () => void;
  onMutated: (id: number) => void;
}

export function ScheduleDetailDialog({
  schedule,
  onClose,
  onMutated,
}: ScheduleDetailDialogProps) {
  const [detailTab, setDetailTab] = useState("overview");
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});
  const [editSlots, setEditSlots] = useState<SlotConfig[]>([]);
  const [propagate, setPropagate] = useState(false);

  const enterEdit = () => {
    if (!schedule) return;
    setEditForm({
      name: schedule.name,
      description: schedule.description || "",
      firstGameStartTime: schedule.firstGameStartTime
        ? utcTimeToLocal(schedule.firstGameStartTime)
        : "",
      gameCreationTime: schedule.gameCreationTime
        ? utcTimeToLocal(schedule.gameCreationTime)
        : "06:00",
      reservationOpenTime: schedule.reservationOpenTime
        ? utcTimeToLocal(schedule.reservationOpenTime)
        : "",
      scheduleStartDate: schedule.scheduleStartDate || "",
      scheduleEndDate: schedule.scheduleEndDate || "",
      gamesPerDay: schedule.gamesPerDay,
      requiresConfirmation: schedule.requiresConfirmation,
      confirmationWindowMinutes: schedule.confirmationWindowMinutes,
      reservationCost: schedule.reservationCost,
      instantReservationCost: schedule.instantReservationCost || 0,
      refundPolicy: schedule.refundPolicy,
      refundPercentage: schedule.refundPercentage || 0,
      isExclusiveToGold: schedule.isExclusiveToGold,
      isActive: schedule.isActive,
      reminderMinutes: (schedule.reminderMinutesBefore || []).join(","),
      recurrenceType: schedule.recurrenceType,
      recurrenceDays: schedule.recurrenceDays || [],
      recurrenceMonth: schedule.recurrencePattern?.month ?? 1,
      recurrenceDay: schedule.recurrencePattern?.day ?? 1,
      onceDate: (() => {
        if (schedule.recurrenceType === "ONCE" && schedule.recurrencePattern) {
          const { year, month, day } = schedule.recurrencePattern;
          const y = year ?? new Date().getFullYear();
          return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        }
        return new Date().toISOString().split("T")[0];
      })(),
    });
    setEditSlots(schedule.slotConfigs || []);
    setEditMode(true);
  };

  const handleSaveEdit = async () => {
    if (!schedule) return;
    const f = editForm;
    const reminders = String(f.reminderMinutes || "")
      .split(",")
      .map(Number)
      .filter(Boolean);
    const cleanSlots = editSlots.map(
      ({ slotNumber, team, isGoldOnly, coinsCost, preAssignedUserId }) => ({
        slotNumber,
        team,
        isGoldOnly: !!isGoldOnly,
        coinsCost: coinsCost != null ? Number(coinsCost) : null,
        preAssignedUserId:
          preAssignedUserId != null ? Number(preAssignedUserId) : null,
      }),
    );
    let recPattern: { year: number; month: number; day: number } | null = null;
    let recDays: number[] | null =
      (f.recurrenceDays as number[])?.length > 0
        ? (f.recurrenceDays as number[])
        : null;
    if (f.recurrenceType === "ONCE") {
      recDays = null;
      if (f.onceDate) {
        const [y, m, d] = (f.onceDate as string).split("-").map(Number);
        recPattern = { year: y, month: m, day: d };
      }
    } else if (f.recurrenceType === "YEARLY") {
      recPattern = {
        month: Number(f.recurrenceMonth),
        day: Number(f.recurrenceDay),
      } as typeof recPattern;
    }
    try {
      await api.updateSchedule(schedule.id, {
        name: f.name,
        description: f.description || null,
        firstGameStartTime: localTimeToUtc(f.firstGameStartTime as string),
        gameCreationTime: localTimeToUtc(
          (f.gameCreationTime as string) || "06:00",
        ),
        reservationOpenTime: (f.reservationOpenTime as string)?.trim()
          ? localTimeToUtc((f.reservationOpenTime as string).trim())
          : null,
        scheduleStartDate: (f.scheduleStartDate as string)?.trim() || null,
        scheduleEndDate: (f.scheduleEndDate as string)?.trim() || null,
        gamesPerDay: Number(f.gamesPerDay),
        requiresConfirmation: !!f.requiresConfirmation,
        confirmationWindowMinutes: f.requiresConfirmation
          ? Number(f.confirmationWindowMinutes)
          : 0,
        reservationCost: Number(f.reservationCost),
        instantReservationCost: f.requiresConfirmation
          ? Number(f.instantReservationCost) || null
          : null,
        refundPolicy: f.refundPolicy,
        refundPercentage:
          f.refundPolicy === "PARTIAL" ? Number(f.refundPercentage) : null,
        isExclusiveToGold: !!f.isExclusiveToGold,
        isActive: f.isActive as boolean,
        reminderMinutesBefore:
          f.requiresConfirmation && reminders.length ? reminders : null,
        recurrenceType: f.recurrenceType as string,
        recurrenceDays: recDays,
        recurrencePattern: recPattern,
        slotConfigs: cleanSlots,
        propagateNow: propagate,
      });
      toast.success("Schedule updated");
      setEditMode(false);
      onMutated(schedule.id);
    } catch (err) {
      toastError(err);
    }
  };

  const handleClose = () => {
    setDetailTab("overview");
    setEditMode(false);
    setPropagate(false);
    onClose();
  };

  if (!schedule) return null;

  return (
    <Dialog
      open
      onClose={handleClose}
      title="Schedule Details"
      className="max-w-4xl"
    >
      <div className="flex items-center justify-between mb-2">
        <Tabs
          tabs={[
            { id: "overview", label: "Overview" },
            { id: "recurrence", label: "Recurrence" },
            { id: "slots", label: "Slots" },
            { id: "games", label: "Games" },
          ]}
          activeTab={detailTab}
          onTabChange={setDetailTab}
        />
        {!editMode && (
          <div className="flex items-center gap-2 shrink-0 ml-4 mb-4">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${schedule.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}
            >
              {schedule.isActive ? (
                <>
                  <i className="fas fa-circle text-[8px]" /> Active
                </>
              ) : (
                "Inactive"
              )}
            </span>
            <Button size="sm" onClick={enterEdit}>
              Edit
            </Button>
          </div>
        )}
      </div>

      {detailTab === "overview" && !editMode && (
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="py-2 font-medium w-1/3">ID</td>
              <td>{schedule.id}</td>
            </tr>
            <tr>
              <td className="py-2 font-medium">Name</td>
              <td>{schedule.name}</td>
            </tr>
            <tr>
              <td className="py-2 font-medium">Description</td>
              <td>{schedule.description || "N/A"}</td>
            </tr>
            <tr>
              <td className="py-2 font-medium">Active</td>
              <td>{schedule.isActive ? "Yes" : "No"}</td>
            </tr>
            <tr>
              <td className="py-2 font-medium">Schedule Start Date</td>
              <td>{schedule.scheduleStartDate || "No limit"}</td>
            </tr>
            <tr>
              <td className="py-2 font-medium">Schedule End Date</td>
              <td>{schedule.scheduleEndDate || "No limit"}</td>
            </tr>
            <tr>
              <td className="py-2 font-medium">Game Creation Time</td>
              <td>
                {schedule.gameCreationTime
                  ? utcTimeToLocal(schedule.gameCreationTime)
                  : "N/A"}
              </td>
            </tr>
            <tr>
              <td className="py-2 font-medium">Reservation Open Time</td>
              <td>
                {schedule.reservationOpenTime
                  ? utcTimeToLocal(schedule.reservationOpenTime)
                  : "Immediate (on creation)"}
              </td>
            </tr>
            <tr>
              <td className="py-2 font-medium">Estimated Stream Start</td>
              <td>
                {schedule.firstGameStartTime
                  ? utcTimeToLocal(schedule.firstGameStartTime)
                  : "N/A"}
              </td>
            </tr>
            <tr>
              <td className="py-2 font-medium">Games/Day</td>
              <td>{schedule.gamesPerDay}</td>
            </tr>
            <tr>
              <td className="py-2 font-medium">Reservation Cost</td>
              <td>{schedule.reservationCost} coins</td>
            </tr>
            <tr>
              <td className="py-2 font-medium">Requires Confirmation</td>
              <td>{schedule.requiresConfirmation ? "Yes" : "No"}</td>
            </tr>
            {schedule.requiresConfirmation && (
              <tr>
                <td className="py-2 font-medium">Confirm Window</td>
                <td>{schedule.confirmationWindowMinutes} min</td>
              </tr>
            )}
            {schedule.requiresConfirmation && (
              <tr>
                <td className="py-2 font-medium">Instant Reserve Cost</td>
                <td>{schedule.instantReservationCost || 0} coins</td>
              </tr>
            )}
            <tr>
              <td className="py-2 font-medium">Refund Policy</td>
              <td>
                {schedule.refundPolicy}
                {schedule.refundPercentage
                  ? ` (${schedule.refundPercentage}%)`
                  : ""}
              </td>
            </tr>
            <tr>
              <td className="py-2 font-medium">Exclusive to Gold</td>
              <td>{schedule.isExclusiveToGold ? "Yes" : "No"}</td>
            </tr>
            <tr>
              <td className="py-2 font-medium">Created</td>
              <td>{formatDate(schedule.createdAt)}</td>
            </tr>
          </tbody>
        </table>
      )}
      {detailTab === "overview" && editMode && (
        <div className="space-y-3">
          <FormRow label="Name">
            <FormInput form={editForm} field="name" setForm={setEditForm} />
          </FormRow>
          <FormRow label="Description">
            <FormInput
              form={editForm}
              field="description"
              setForm={setEditForm}
            />
          </FormRow>
          <div className="grid grid-cols-2 gap-3">
            <FormRow
              label="Schedule Start Date"
              title="First day games may be generated (optional)"
            >
              <input
                type="date"
                value={String(editForm.scheduleStartDate || "")}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    scheduleStartDate: e.target.value,
                  })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </FormRow>
            <FormRow
              label="Schedule End Date"
              title="Last day games may be generated (optional — leave blank for no end)"
            >
              <input
                type="date"
                value={String(editForm.scheduleEndDate || "")}
                onChange={(e) =>
                  setEditForm({ ...editForm, scheduleEndDate: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </FormRow>
            <FormRow
              label="Game Creation Time"
              title="Time at which games are auto-generated each period (your local time)"
            >
              <input
                type="time"
                value={String(editForm.gameCreationTime || "")}
                onChange={(e) =>
                  setEditForm({ ...editForm, gameCreationTime: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </FormRow>
            <FormRow
              label="Reservation Open Time"
              title="Time at which reservations open in your local time; leave blank to open immediately"
            >
              <input
                type="time"
                value={String(editForm.reservationOpenTime || "")}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    reservationOpenTime: e.target.value || "",
                  })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </FormRow>
            <FormRow label="Estimated Stream Start">
              <input
                type="time"
                value={String(editForm.firstGameStartTime || "")}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    firstGameStartTime: e.target.value,
                  })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </FormRow>
            <FormRow label="Games/Day">
              <FormInput
                form={editForm}
                field="gamesPerDay"
                setForm={setEditForm}
                type="number"
              />
            </FormRow>
            <FormRow label="Reserve Cost">
              <FormInput
                form={editForm}
                field="reservationCost"
                setForm={setEditForm}
                type="number"
              />
            </FormRow>
            <FormRow label="Refund Policy">
              <FormSelect
                form={editForm}
                field="refundPolicy"
                setForm={setEditForm}
                options={REFUND_POLICIES}
              />
            </FormRow>
          </div>
          {editForm.refundPolicy === "PARTIAL" && (
            <FormRow label="Refund %">
              <FormInput
                form={editForm}
                field="refundPercentage"
                setForm={setEditForm}
                type="number"
              />
            </FormRow>
          )}
          <FormCheckbox
            form={editForm}
            field="isExclusiveToGold"
            setForm={setEditForm}
            label="Exclusive to Gold"
          />
          <div className="border-t pt-3 mt-3">
            <FormCheckbox
              form={editForm}
              field="requiresConfirmation"
              setForm={setEditForm}
              label="Require reservation confirmation"
            />
            {editForm.requiresConfirmation && (
              <div className="grid grid-cols-2 gap-3 mt-3 pl-4 border-l-2 border-indigo-200">
                <FormRow label="Confirm Window (min)">
                  <FormInput
                    form={editForm}
                    field="confirmationWindowMinutes"
                    setForm={setEditForm}
                    type="number"
                  />
                </FormRow>
                <FormRow label="Instant Reserve Cost">
                  <FormInput
                    form={editForm}
                    field="instantReservationCost"
                    setForm={setEditForm}
                    type="number"
                  />
                </FormRow>
                <FormRow label="Reminder Minutes">
                  <FormInput
                    form={editForm}
                    field="reminderMinutes"
                    setForm={setEditForm}
                    placeholder="30,15"
                  />
                </FormRow>
              </div>
            )}
          </div>
          <div className="border-t border-gray-200 pt-3 mt-3">
            <FormCheckbox
              form={{ propagate }}
              field="propagate"
              setForm={(v) => setPropagate(!!v.propagate)}
              label="Propagate changes now (cancel CREATED games and regenerate)"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditMode(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save</Button>
          </div>
        </div>
      )}

      {detailTab === "recurrence" && !editMode && (
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="py-2 font-medium w-1/3">Type</td>
              <td>{schedule.recurrenceType}</td>
            </tr>
            <tr>
              <td className="py-2 font-medium">Days</td>
              <td>
                {schedule.recurrenceType === "WEEKLY" && schedule.recurrenceDays
                  ? schedule.recurrenceDays
                      .map((d) => WEEKDAYS[d - 1])
                      .join(", ")
                  : schedule.recurrenceType === "YEARLY" &&
                      schedule.recurrencePattern
                    ? `Month ${schedule.recurrencePattern.month}, Day ${schedule.recurrencePattern.day}`
                    : schedule.recurrenceType === "ONCE" &&
                        schedule.recurrencePattern
                      ? (() => {
                          const { year, month, day } =
                            schedule.recurrencePattern;
                          const y = year ?? new Date().getFullYear();
                          return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                        })()
                      : schedule.recurrenceDays?.join(", ") || "N/A"}
              </td>
            </tr>
          </tbody>
        </table>
      )}
      {detailTab === "recurrence" && editMode && (
        <div className="space-y-3">
          <RecurrenceForm form={editForm} setForm={setEditForm} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditMode(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save</Button>
          </div>
        </div>
      )}

      {detailTab === "slots" && !editMode && (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Team</th>
                <th className="px-3 py-2 text-left">Gold Only</th>
                <th className="px-3 py-2 text-left">Cost Override</th>
                <th className="px-3 py-2 text-left">Pre-assigned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(schedule.slotConfigs || [])
                .sort((a, b) => a.slotNumber - b.slotNumber)
                .map((s) => (
                  <tr key={s.slotNumber}>
                    <td className="px-3 py-2">{s.slotNumber}</td>
                    <td className="px-3 py-2">{teamDisplay(s.team)}</td>
                    <td className="px-3 py-2">{s.isGoldOnly ? "Yes" : "No"}</td>
                    <td className="px-3 py-2">{s.coinsCost ?? "Default"}</td>
                    <td className="px-3 py-2">
                      {s.preAssignedUserId || "None"}
                    </td>
                  </tr>
                ))}
              {(!schedule.slotConfigs || schedule.slotConfigs.length === 0) && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-4 text-center text-gray-400"
                  >
                    No slot configs
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {detailTab === "slots" && editMode && (
        <div className="space-y-3">
          <SlotConfigEditor slots={editSlots} setSlots={setEditSlots} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditMode(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save</Button>
          </div>
        </div>
      )}

      {detailTab === "games" && (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Start Time</th>
                <th className="px-3 py-2 text-left">Slots</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(schedule.games || []).map((g) => (
                <tr key={g.id}>
                  <td className="px-3 py-2">{g.id}</td>
                  <td className="px-3 py-2">
                    <StatusBadge
                      status={g.status}
                      colorMap={GAME_STATUS_COLORS}
                    />
                  </td>
                  <td className="px-3 py-2">
                    {formatDate(g.scheduledStartTime)}
                  </td>
                  <td className="px-3 py-2">
                    {g.slotsReserved || 0}/{g.totalSlots || "?"}
                  </td>
                </tr>
              ))}
              {(!schedule.games || schedule.games.length === 0) && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-4 text-center text-gray-400"
                  >
                    No games
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Dialog>
  );
}
