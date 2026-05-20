"use client";

// Collapsible category groups. Search flattens the list.
// All groups collapsed by default; tap header to expand.

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, X, ChevronDown, Eye, Calendar, BookOpen } from "lucide-react";
import { api } from "@/lib/api";
import { Loading } from "@/components/loading";
import { EmptyState } from "@/components/empty-state";
import { ErrorDisplay } from "@/components/error-display";
import { cn, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { GiScrollUnfurled } from "react-icons/gi";
import type { Tutorial, TutorialFilters } from "@/types";

function TutorialCard({
  tutorial,
  onTap,
}: {
  tutorial: Tutorial;
  onTap: () => void;
}) {
  return (
    <button
      onClick={onTap}
      className="panel-dark w-full text-left p-4 mb-3 active:scale-[0.98] transition-transform"
    >
      <h3 className="text-sm font-bold text-[#f0f0f0] mb-1 line-clamp-2">
        {tutorial.title}
      </h3>
      {tutorial.excerpt && (
        <p className="text-xs text-[#8a8a8a] line-clamp-2 mb-2">
          {tutorial.excerpt}
        </p>
      )}
      <div className="flex items-center gap-3 text-xs text-[#6a6a6a]">
        <span className="flex items-center gap-1">
          <Eye className="w-3 h-3" />
          {tutorial.viewCount}
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {formatDate(tutorial.createdAt)}
        </span>
      </div>
      {tutorial.category && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className="px-2 py-0.5 bg-[#2a9d8f]/15 text-[#2a9d8f] text-[10px] rounded">
            {tutorial.category.name}
          </span>
        </div>
      )}
    </button>
  );
}

type Group = {
  key: string;
  label: string;
  tutorials: Tutorial[];
};

function groupTutorials(tutorials: Tutorial[]): Group[] {
  const groups: Group[] = [];

  const catMap = new Map<number, { name: string; tutorials: Tutorial[] }>();
  for (const t of tutorials) {
    if (!t.category) continue;
    const entry = catMap.get(t.category.id);
    if (entry) {
      entry.tutorials.push(t);
    } else {
      catMap.set(t.category.id, {
        name: t.category.name,
        tutorials: [t],
      });
    }
  }
  const sortedCats = Array.from(catMap.entries()).sort((a, b) =>
    a[1].name.localeCompare(b[1].name),
  );
  for (const [id, { name, tutorials: catTuts }] of sortedCats) {
    groups.push({
      key: `cat-${id}`,
      label: name,
      tutorials: catTuts,
    });
  }

  return groups;
}

export default function TutorialsPage() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const isSearching = debouncedSearch.length > 0;

  const filters: TutorialFilters = isSearching
    ? { search: debouncedSearch }
    : {};

  const {
    data: tutorials = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["tutorials", filters],
    queryFn: () => api.getTutorials(filters),
  });

  const groups = useMemo(() => groupTutorials(tutorials), [tutorials]);

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="flex flex-col h-full">
      <PageHeader label="Guide" icon={GiScrollUnfurled} />

      <div className="px-4 py-3 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6a6a6a]" />
          <input
            type="text"
            placeholder="Search tutorials..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="auth-input pl-9 pr-9 py-2 text-sm"
          />
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput("");
                setDebouncedSearch("");
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6a6a6a] hover:text-[#c0c0c0]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {isLoading && <Loading message="Loading tutorials..." />}
        {error && <ErrorDisplay message={String(error)} onRetry={refetch} />}
        {!isLoading && !error && tutorials.length === 0 && (
          <EmptyState message="No tutorials found" icon={BookOpen} />
        )}

        {!isLoading &&
          !error &&
          tutorials.length > 0 &&
          (isSearching
            ? tutorials.map((t) => (
                <TutorialCard
                  key={t.id}
                  tutorial={t}
                  onTap={() => router.push(`/tutorials/${t.id}`)}
                />
              ))
            : groups.map((g) => {
                const open = expanded.has(g.key);
                return (
                  <div key={g.key} className="mb-3">
                    <button
                      onClick={() => toggle(g.key)}
                      className={cn(
                        "panel-dark w-full flex items-center justify-between px-3 py-2.5 text-left",
                        open && "mb-2",
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-bold uppercase tracking-wider truncate text-[#f0f0f0]">
                          {g.label}
                        </span>
                        <span className="text-xs text-[#6a6a6a] shrink-0">
                          ({g.tutorials.length})
                        </span>
                      </div>
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 text-[#8a8a8a] transition-transform shrink-0",
                          open && "rotate-180",
                        )}
                      />
                    </button>
                    {open && (
                      <div className="pl-1">
                        {g.tutorials.map((t) => (
                          <TutorialCard
                            key={t.id}
                            tutorial={t}
                            onTap={() => router.push(`/tutorials/${t.id}`)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              }))}
      </div>
    </div>
  );
}
