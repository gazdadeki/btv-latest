# Web Admin Dashboard (Next.js)

## Architecture

- Next.js 15 App Router, admin dashboard only
- Routes: `/admin/*` (protected), `/downloads` (public), `/reset-password` (public), `/` redirects to `/admin`
- API calls proxied via Next.js rewrites (`/api/*` → backend)

## Auth

- Middleware reads `admin_access_token` cookie server-side to protect `/admin/*` routes
- `admin_user` cookie is client-side only (used for display purposes)

## UI

- Tailwind CSS v4, shadcn/ui component patterns
- TanStack Table for data tables
- Sonner for toast notifications
- Socket.IO client for real-time updates (direct to backend)

## Date Display Utils

- `src/lib/utils.ts`: `formatDate()`, `formatDateOnly()`, `localTimeToUtc()`, `utcTimeToLocal()`
- Always convert UTC ISO strings to local timezone for display
