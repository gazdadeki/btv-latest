# Mobile PWA (Next.js)

## Architecture

- Next.js 15 App Router PWA for players
- `@ducanh2912/next-pwa` v10 — disabled in dev, enabled in production
- Route groups: `(app)/` for authenticated, `(auth)/` for public

## Auth

- Cookie-based: `player_user` cookie read by middleware (`src/middleware.ts`)
- Unauthenticated → `/login`; authenticated but unverified → `/verification`; authenticated and verified → `/home`
- `AuthProvider` / `useAuth()` React context for auth state

## Data

- TanStack Query v5 for server state
- Stripe JS for payments
- Socket.IO client for real-time updates
- Shares types via `@btv/types`
- `GET /players/schedules/today` response is flattened in `api.ts` from `{ schedule, games }` to flat `ScheduleSection`

## Game Statuses

- `GameStatus` includes: `CREATED`, `OPEN`, `IN_PROGRESS`, `FINISHED`, `CANCELLED`
- `GameStatusFilter` includes `includeOpen` — all non-cancelled statuses shown by default
- `gameIsAvailable()` returns true for both `CREATED` and `OPEN`

## Date Display Utils

- `src/lib/utils.ts`: `formatDateTime()`, `formatDate()`, `formatTime()`, `formatTimeAgo()`
- All functions accept UTC ISO strings from API and auto-convert to browser local timezone via `toLocaleString()`

## Development

- Dev server binds to `0.0.0.0` (not `localhost`) for LAN testing from mobile devices
