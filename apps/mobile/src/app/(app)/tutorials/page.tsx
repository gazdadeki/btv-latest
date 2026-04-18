"use client";

// Translated from Mobile/lib/features/tutorials/pages/tutorials_list_page.dart
// Search with 500ms debounce. Featured filter toggle. Tap card → /tutorials/[id].

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, Star, X, Eye, Calendar, BookOpen } from "lucide-react";
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
      {tutorial.featured && (
        <div className="mb-2">
          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-[#c9a84c]/15 text-[#c9a84c] text-[10px] font-bold uppercase tracking-wider rounded shrink-0">
            <Star className="w-3 h-3 fill-[#c9a84c]" />
            Featured
          </span>
        </div>
      )}
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
      {(tutorial.tags.length > 0 || tutorial.categories.length > 0) && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {tutorial.tags.map((t) => (
            <span
              key={t.id}
              className="px-2 py-0.5 bg-[#2a2620] text-[#a89f8e] text-[10px] rounded"
            >
              {t.name}
            </span>
          ))}
          {tutorial.categories.map((c) => (
            <span
              key={c.id}
              className="px-2 py-0.5 bg-[#2a9d8f]/15 text-[#2a9d8f] text-[10px] rounded"
            >
              {c.name}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

export default function TutorialsPage() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [featuredOnly, setFeaturedOnly] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filters: TutorialFilters = {
    ...(featuredOnly ? { featured: true } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  };

  const {
    data: tutorials = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["tutorials", filters],
    queryFn: () => api.getTutorials(filters),
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <PageHeader
        label="Guide"
        icon={GiScrollUnfurled}
        rightAction={
          <button
            onClick={() => setFeaturedOnly((f) => !f)}
            className={cn(
              "p-1.5 rounded",
              featuredOnly ? "text-[#c9a84c]" : "text-[#7a7366]",
            )}
            title={featuredOnly ? "Show all" : "Featured only"}
          >
            <Star className={cn("w-5 h-5", featuredOnly && "fill-[#c9a84c]")} />
          </button>
        }
      />

      {/* Search */}
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {isLoading && <Loading message="Loading tutorials..." />}
        {error && <ErrorDisplay message={String(error)} onRetry={refetch} />}
        {!isLoading && !error && tutorials.length === 0 && (
          <EmptyState message="No tutorials found" icon={BookOpen} />
        )}
        {tutorials.map((t) => (
          <TutorialCard
            key={t.id}
            tutorial={t}
            onTap={() => router.push(`/tutorials/${t.id}`)}
          />
        ))}
      </div>
    </div>
  );
}
