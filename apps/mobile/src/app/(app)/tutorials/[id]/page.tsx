'use client';

// Translated from Mobile/lib/features/tutorials/pages/tutorial_detail_page.dart
// Uses react-markdown for body rendering. Shows featured badge, view count, date, author, tags, categories.

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { ChevronLeft, Star, Eye, Calendar, User } from 'lucide-react';
import { api } from '@/lib/api';
import { Loading } from '@/components/loading';
import { ErrorDisplay } from '@/components/error-display';
import { formatDate } from '@/lib/utils';

export default function TutorialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const tutorialId = parseInt(id, 10);
  const router = useRouter();

  const { data: tutorial, isLoading, error, refetch } = useQuery({
    queryKey: ['tutorial', tutorialId],
    queryFn: () => api.getTutorialById(tutorialId),
  });

  if (isLoading) return <Loading message="Loading tutorial..." />;
  if (error || !tutorial) return <ErrorDisplay message={String(error ?? 'Tutorial not found')} onRetry={refetch} />;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-2 py-3 flex items-center gap-2 shrink-0">
        <button onClick={() => router.back()} className="p-1.5 text-gray-500">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-sm font-bold text-gray-900 flex-1 truncate">Tutorial</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Featured badge */}
        {tutorial.featured && (
          <div className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-full mb-4">
            <Star className="w-3 h-3 fill-white" />
            Featured
          </div>
        )}

        {/* Title */}
        <h2 className="text-xl font-bold text-gray-900 mb-3">{tutorial.title}</h2>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-3">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {tutorial.viewCount} views
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(tutorial.createdAt)}
          </span>
          {tutorial.author && (
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {tutorial.author.username ?? tutorial.author.email}
            </span>
          )}
        </div>

        {/* Tags & categories */}
        {(tutorial.tags.length > 0 || tutorial.categories.length > 0) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {tutorial.tags.map(t => (
              <span key={t.id} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{t.name}</span>
            ))}
            {tutorial.categories.map(c => (
              <span key={c.id} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">{c.name}</span>
            ))}
          </div>
        )}

        <hr className="border-gray-200 mb-5" />

        {/* Markdown body */}
        <div className="prose prose-sm max-w-none text-gray-800">
          <ReactMarkdown
            components={{
              h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2 text-gray-900">{children}</h1>,
              h2: ({ children }) => <h2 className="text-lg font-bold mt-4 mb-2 text-gray-900">{children}</h2>,
              h3: ({ children }) => <h3 className="text-base font-bold mt-3 mb-1 text-gray-800">{children}</h3>,
              p: ({ children }) => <p className="text-sm leading-relaxed mb-3 text-gray-700">{children}</p>,
              ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1 text-sm text-gray-700">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1 text-sm text-gray-700">{children}</ol>,
              code: ({ children, ...props }) => {
                const isInline = !('className' in props);
                return isInline
                  ? <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono text-gray-800">{children}</code>
                  : <pre className="bg-gray-100 rounded-lg p-3 overflow-x-auto mb-3"><code className="text-xs font-mono text-gray-800">{children}</code></pre>;
              },
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-indigo-300 pl-3 italic text-gray-600 my-3">{children}</blockquote>
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
