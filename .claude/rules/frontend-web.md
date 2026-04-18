---
paths:
  - "apps/web/src/**/*.ts"
  - "apps/web/src/**/*.tsx"
---

# Web Admin Dashboard Rules (Next.js 15)

## Architecture

- Next.js 15 App Router — use server components by default, `'use client'` only when needed
- Routes: `/admin/*` (protected), `/downloads` (public), `/reset-password` (public)
- API calls proxied via Next.js rewrites (`/api/*` → backend)

## Auth

- Cookie-based: `admin_access_token` (HTTP-only) and `admin_user` (client-readable)
- Middleware at `src/middleware.ts` protects `/admin/*` routes
- Never reference `player_*` cookies in this app

## UI Components

- Tailwind CSS v4 for styling
- shadcn/ui component patterns in `src/components/ui/`
- TanStack Table for data tables
- Sonner for toast notifications
- Lucide React for icons

## Text Overflow

- `TooltipProvider` mounted globally in `src/app/layout.tsx`
- Use `<TruncatedText>` from `@/components/ui/truncated-text` for variable-length text (emails, usernames, titles, descriptions) — auto-detects overflow and only mounts a Radix tooltip when truncated
- Pair with `min-w-0` (or `flex-1 min-w-0`) on flex children so `truncate` can clip

## Date Display

- Always convert UTC ISO strings to local timezone for display
- Use utils from `src/lib/utils.ts`: `formatDate()`, `formatDateOnly()`, `utcTimeToLocal()`
- When sending dates to backend: always UTC ISO 8601, use `localTimeToUtc()`
