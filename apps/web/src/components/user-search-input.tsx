"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

interface UserResult {
  id: number;
  username: string;
  email: string;
}

interface UserSearchInputProps {
  value: number | null | undefined;
  displayName?: string;
  onChange: (userId: number | null, username: string | null) => void;
  disabled?: boolean;
  className?: string;
}

export function UserSearchInput({
  value,
  displayName,
  onChange,
  disabled,
  className,
}: UserSearchInputProps) {
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
        onFocus={() => !disabled && results.length > 0 && setShowDropdown(true)}
        disabled={disabled}
        className={`border border-gray-300 rounded px-2 py-1 text-xs ${disabled ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""} ${className ?? "w-28"}`}
      />
      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded shadow-lg max-h-36 overflow-y-auto">
          {results.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => handleSelect(u)}
              className="w-full text-left px-2 py-1.5 text-xs hover:bg-indigo-50"
            >
              <span className="font-medium">{u.username}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
