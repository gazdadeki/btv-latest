"use client";

import { teamDisplay } from "@/constants";
import { UserSearchInput } from "@/components/user-search-input";
import type { SlotConfig } from "@/types";

interface SlotConfigEditorProps {
  slots: SlotConfig[];
  setSlots: (s: SlotConfig[]) => void;
  disableGold?: boolean;
}

export function SlotConfigEditor({
  slots,
  setSlots,
  disableGold,
}: SlotConfigEditorProps) {
  const teamA = slots
    .filter((s) => s.team === "A")
    .sort((a, b) => a.slotNumber - b.slotNumber);
  const teamB = slots
    .filter((s) => s.team === "B")
    .sort((a, b) => a.slotNumber - b.slotNumber);

  const renderTeam = (
    team: SlotConfig[],
    teamLabel: string,
    accent: string,
  ) => (
    <div>
      <h4 className={`font-semibold text-base mb-3 pb-2 border-b-2 ${accent}`}>
        {teamLabel}
      </h4>
      <div className="space-y-2">
        {team.map((s) => (
          <div
            key={s.slotNumber}
            className="flex items-center gap-2 text-xs p-2 bg-gray-50 rounded"
          >
            <span className="font-mono w-8">#{s.slotNumber}</span>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={!disableGold && !!s.isGoldOnly}
                disabled={disableGold}
                onChange={(e) =>
                  setSlots(
                    slots.map((sl) =>
                      sl.slotNumber === s.slotNumber
                        ? { ...sl, isGoldOnly: e.target.checked }
                        : sl,
                    ),
                  )
                }
                className="rounded"
              />
              Gold
            </label>
            <input
              type="number"
              placeholder="Cost override"
              value={s.coinsCost ?? ""}
              min={0}
              onChange={(e) =>
                setSlots(
                  slots.map((sl) =>
                    sl.slotNumber === s.slotNumber
                      ? {
                          ...sl,
                          coinsCost: e.target.value
                            ? Number(e.target.value)
                            : null,
                        }
                      : sl,
                  ),
                )
              }
              className="w-24 border border-gray-300 rounded px-2 py-1"
            />
            <UserSearchInput
              value={s.preAssignedUserId}
              displayName={s.preAssignedUsername ?? undefined}
              disabled={s.slotNumber === 1}
              onChange={(userId, username) =>
                setSlots(
                  slots.map((sl) =>
                    sl.slotNumber === s.slotNumber
                      ? {
                          ...sl,
                          preAssignedUserId: userId,
                          preAssignedUsername: username,
                        }
                      : sl,
                  ),
                )
              }
            />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-4">
      {renderTeam(teamA, teamDisplay("A"), "border-red-600 text-red-600")}
      {renderTeam(teamB, teamDisplay("B"), "border-green-600 text-green-600")}
    </div>
  );
}
