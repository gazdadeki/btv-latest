"use client";

// Translated from Mobile/lib/features/tutorials/pages/tutorial_detail_page.dart
// Uses react-markdown for body rendering. Shows view count, date, author, category.

import { use } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { ChevronLeft, Eye, Calendar, User } from "lucide-react";
import { api } from "@/lib/api";
import { Loading } from "@/components/loading";
import { ErrorDisplay } from "@/components/error-display";
import { formatDate } from "@/lib/utils";

function extractYoutubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      return /^[\w-]{11}$/.test(id) ? id : null;
    }
    if (u.hostname.endsWith("youtube.com")) {
      if (u.pathname === "/watch") {
        const id = u.searchParams.get("v");
        return id && /^[\w-]{11}$/.test(id) ? id : null;
      }
      const match = u.pathname.match(/^\/(embed|shorts|v)\/([\w-]{11})/);
      return match ? match[2] : null;
    }
    return null;
  } catch {
    return null;
  }
}

export default function TutorialDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const tutorialId = parseInt(id, 10);
  const router = useRouter();

  const {
    data: tutorial,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["tutorial", tutorialId],
    queryFn: () => api.getTutorialById(tutorialId),
  });

  if (isLoading) return <Loading message="Loading tutorial..." />;
  if (error || !tutorial)
    return (
      <ErrorDisplay
        message={String(error ?? "Tutorial not found")}
        onRetry={refetch}
      />
    );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="arena-header px-2 py-3 flex items-center gap-2 shrink-0">
        <button
          onClick={() => router.back()}
          className="p-1.5 text-[#c9a84c] hover:text-[#d4b04a]"
          aria-label="Go back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-sm font-bold text-[#c9a84c] flex-1 truncate uppercase tracking-wider">
          Tutorial
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Title */}
        <h2 className="text-xl font-bold text-[#f0f0f0] mb-3">
          {tutorial.title}
        </h2>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-[#8a8a8a] mb-3">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {tutorial.viewCount} views
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(tutorial.createdAt)}
          </span>
          {tutorial.author?.username && (
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {tutorial.author.username}
            </span>
          )}
        </div>

        {/* Category */}
        {tutorial.category && (
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-2 py-0.5 bg-[#2a9d8f]/15 text-[#2a9d8f] text-xs rounded">
              {tutorial.category.name}
            </span>
          </div>
        )}

        <hr className="border-[#2a2620] mb-5" />

        {/* YouTube embed */}
        {tutorial.youtubeUrl &&
          (() => {
            const videoId = extractYoutubeId(tutorial.youtubeUrl);
            if (!videoId) {
              return (
                <div className="mb-5">
                  <a
                    href={tutorial.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#2a9d8f] hover:text-[#3bb5a5] underline text-sm break-all"
                  >
                    {tutorial.youtubeUrl}
                  </a>
                </div>
              );
            }
            return (
              <div className="mb-5 aspect-video w-full overflow-hidden rounded-lg border border-[#2a2620] bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}`}
                  title="YouTube video"
                  className="w-full h-full"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
            );
          })()}

        {/* Markdown body */}
        <div className="max-w-none">
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 className="text-xl font-bold mt-4 mb-2 text-[#f0f0f0]">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-lg font-bold mt-4 mb-2 text-[#f0f0f0]">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-base font-bold mt-3 mb-1 text-[#e0d8c8]">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="text-sm leading-relaxed mb-3 text-[#c0b8a8]">
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside mb-3 space-y-1 text-sm text-[#c0b8a8]">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside mb-3 space-y-1 text-sm text-[#c0b8a8]">
                  {children}
                </ol>
              ),
              a: ({ children, href }) => (
                <a
                  href={href}
                  className="text-[#2a9d8f] hover:text-[#3bb5a5] underline"
                >
                  {children}
                </a>
              ),
              code: ({ children, ...props }) => {
                const isInline = !("className" in props);
                return isInline ? (
                  <code className="bg-[#1a1816] border border-[#2a2620] px-1 py-0.5 rounded text-xs font-mono text-[#c9a84c]">
                    {children}
                  </code>
                ) : (
                  <pre className="bg-[#141210] border border-[#2a2620] rounded-lg p-3 overflow-x-auto mb-3">
                    <code className="text-xs font-mono text-[#e0d8c8]">
                      {children}
                    </code>
                  </pre>
                );
              },
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-[#c9a84c]/60 pl-3 italic text-[#8a8a8a] my-3">
                  {children}
                </blockquote>
              ),
            }}
          >
            {tutorial.body}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
