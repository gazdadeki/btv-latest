'use client';

import { teamDisplay } from '@/constants';
import type { SlotConfig } from '@/types';

interface SlotConfigEditorProps {
  slots: SlotConfig[];
  setSlots: (s: SlotConfig[]) => void;
}

export function SlotConfigEditor({ slots, setSlots }: SlotConfigEditorProps) {
  const teamA = slots.filter((s) => s.team === 'A').sort((a, b) => a.slotNumber - b.slotNumber);
  const teamB = slots.filter((s) => s.team === 'B').sort((a, b) => a.slotNumber - b.slotNumber);

  const renderTeam = (team: SlotConfig[], teamLabel: string) => (
    <div>
      <h4 className="font-medium text-sm mb-2">{teamLabel}</h4>
      <div className="space-y-2">
        {team.map((s) => (
          <div key={s.slotNumber} className="flex items-center gap-2 text-xs p-2 bg-gray-50 rounded">
            <span className="font-mono w-8">#{s.slotNumber}</span>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={!!s.isGoldOnly} onChange={(e) => setSlots(slots.map((sl) => sl.slotNumber === s.slotNumber ? { ...sl, isGoldOnly: e.target.checked } : sl))} className="rounded" />
              Gold
            </label>
            <input
              type="number" placeholder="Cost override"
              value={s.coinsCost ?? ''} min={0}
              onChange={(e) => setSlots(slots.map((sl) => sl.slotNumber === s.slotNumber ? { ...sl, coinsCost: e.target.value ? Number(e.target.value) : null } : sl))}
              className="w-24 border border-gray-300 rounded px-2 py-1"
            />
            <input
              type="number" placeholder="Pre-assign ID"
              value={s.preAssignedUserId ?? ''} min={1}
              onChange={(e) => setSlots(slots.map((sl) => sl.slotNumber === s.slotNumber ? { ...sl, preAssignedUserId: e.target.value ? Number(e.target.value) : null } : sl))}
              className="w-28 border border-gray-300 rounded px-2 py-1"
            />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-4">
      {renderTeam(teamA, `Team A (${teamDisplay('A')})`)}
      {renderTeam(teamB, `Team B (${teamDisplay('B')})`)}
    </div>
  );
}
