"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ScrollableSelectOption {
  value: string;
  label: string;
}

interface ScrollableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: ScrollableSelectOption[];
  placeholder?: string;
  className?: string;
  /** Number of rows shown before the list becomes scrollable. */
  maxVisibleItems?: number;
  /** When true, renders a sticky search input at the top of the dropdown.
   * Filtering is delegated to the parent via `onSearchChange` (server-side). */
  searchable?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  isLoading?: boolean;
}

// ~36px per row (px-3 py-2 + text-sm). Used to compute maxHeight.
const ROW_PX = 36;

export function ScrollableSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className,
  maxVisibleItems = 8,
  searchable = false,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search…",
  isLoading = false,
}: ScrollableSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handle);
    return () => document.removeEventListener("pointerdown", handle);
  }, [open]);

  useEffect(() => {
    if (open && searchable) inputRef.current?.focus();
  }, [open, searchable]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-left flex items-center justify-between gap-2 hover:border-gray-400"
      >
        <span className={cn("truncate", !selected && "text-gray-400")}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {searchable && (
            <div className="relative border-b border-gray-200">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchValue}
                onChange={(e) => onSearchChange?.(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-2 py-2 text-sm focus:outline-none"
              />
            </div>
          )}
          <div
            className="overflow-y-auto"
            style={{ maxHeight: maxVisibleItems * ROW_PX }}
          >
            {isLoading ? (
              <div className="px-3 py-2 text-sm text-gray-400">Loading…</div>
            ) : options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-400">No options</div>
            ) : (
              options.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm hover:bg-gray-50 truncate",
                    o.value === value &&
                      "bg-indigo-50 text-indigo-700 font-medium",
                  )}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
