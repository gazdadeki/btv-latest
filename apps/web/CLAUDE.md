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
- WebSocket connection indicator at bottom of sidebar
- Team colors: Sentinel = `red-600`, Scourge = `green-600`
- `<ScrollableSelect>` in `src/components/scrollable-select.tsx` — button-triggered dropdown with `maxVisibleItems` before scroll. Optional `searchable` mode renders a sticky search input and delegates filtering to the parent via `onSearchChange` (use with a debounced value + server-side `?search=` for large lists like the stream filter). Keep native `<select>` for small fixed lists.

## Data Tables

- Shared `<DataTable>` in `src/components/data-table.tsx`. Default mode is client-side (TanStack pagination + global filter).
- For endpoints backed by server-side pagination, pass a `server` prop: `{ page, pageSize, total, onPageChange, onPageSizeChange?, search?, onSearchChange?, isLoading? }`. The table then uses `manualPagination` + `manualFiltering` and the parent owns state. See `users/page.tsx` (with debounced server search) and `games/page.tsx` (with `hideSearch`) for the two patterns.
- Debounce search input via `useDebouncedValue` hook (`src/hooks/use-debounced-value.ts`); reset `page` to 1 whenever filters or the debounced search value change.

## Stream Controls

- Persistent stream control in header bar (all pages): Start Stream / End Stream buttons
- "Start Stream" opens dialog with title (optional, defaults to "Let's GO - date") + URL (required)
- Dashboard widget shows today's stream status, title, game count with same start/end controls
- Local `stream:changed` event via `webSocketManager.emitLocal()` keeps Games page and dashboard in sync

## Date Display Utils

- `src/lib/utils.ts`: `formatDate()`, `formatDateOnly()`, `localTimeToUtc()`, `utcTimeToLocal()`
- Always convert UTC ISO strings to local timezone for display
