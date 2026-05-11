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

- Cookie-based: `access_token` (HTTP-only, set by backend) and `user` (client-readable, set by frontend after login)
- Middleware at `src/middleware.ts` protects `/admin/*` routes via cookie presence
- Role separation enforced at login: the `api.login()` wrapper rejects non-admin roles client-side

## UI Components

- Tailwind CSS v4 for styling
- shadcn/ui component patterns in `src/components/ui/`
- TanStack Table for data tables
- Sonner for toast notifications
- Lucide React for icons

## Date Display

- Always convert UTC ISO strings to local timezone for display
- Use utils from `src/lib/utils.ts`: `formatDate()`, `formatDateOnly()`, `utcTimeToLocal()`
- When sending dates to backend: always UTC ISO 8601, use `localTimeToUtc()`
