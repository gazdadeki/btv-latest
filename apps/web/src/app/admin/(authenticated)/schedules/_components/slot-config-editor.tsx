"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { teamDisplay } from "@/constants";
import { api } from "@/lib/api";
import type { SlotConfig } from "@/types";

interface UserResult {
  id: number;
  username: string;
  email: string;
}

function UserSearchInput({
  value,
  displayName,
  onChange,
}: {
  value: number | null | undefined;
  displayName?: string;
  onChange: (userId: number | null, username: string | null) => void;
}) {
  const [query, setQuery] = useState(displayName || "");
  const [results, setResults] = useState<UserResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(displayName || "");
  }, [displayName]);

  const search = useCallback(async (term: string) => {
    if (!term || term.length < 2) {
      setResults([]);
      return;
    }
    try {
      const res = (await api.getUsers({ search: term, limit: "5" })) as {
        data?: UserResult[];
      };
      setResults(res.data || (Array.isArray(res) ? res : []));
    } catch {
      setResults([]);
    }
  }, []);

  const handleInput = (val: string) => {
    setQuery(val);
    if (!val) {
      onChange(null, null);
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 250);
    setShowDropdown(true);
  };

  const handleSelect = (user: UserResult) => {
    setQuery(user.username);
    onChange(user.id, user.username);
    setShowDropdown(false);
    setResults([]);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        placeholder="Search user..."
        value={query}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => results.length > 0 && setShowDropdown(true)}
        className="w-28 border border-gray-300 rounded px-2 py-1 text-xs"
      />
      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded shadow-lg max-h-36 overflow-y-auto">
          {results.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => handleSelect(u)}
              className="w-full text-left px-2 py-1.5 text-xs hover:bg-indigo-50 flex justify-between"
            >
              <span className="font-medium">{u.username}</span>
              <span className="text-gray-400">{u.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface SlotConfigEditorProps {
  slots: SlotConfig[];
  setSlots: (s: SlotConfig[]) => void;
}

export function SlotConfigEditor({ slots, setSlots }: SlotConfigEditorProps) {
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
                checked={!!s.isGoldOnly}
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
