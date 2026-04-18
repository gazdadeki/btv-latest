---
paths:
  - "apps/mobile/src/**/*.ts"
  - "apps/mobile/src/**/*.tsx"
---

# Mobile PWA Rules (Next.js 15)

## Architecture

- Next.js 15 App Router PWA for players
- `@ducanh2912/next-pwa` v10 — disabled in dev, enabled in production
- Route groups: `(app)/` for authenticated, `(auth)/` for public

## Auth

- Cookie-based: `player_user` cookie read by middleware
- `AuthProvider` / `useAuth()` React context for auth state
- Unauthenticated → `/login`, unverified → `/verification`
- Never reference `admin_*` cookies in this app

## Data Fetching

- TanStack Query v5 for server state — use `useQuery`, `useMutation`
- Stripe JS for payment flows
- Socket.IO client for real-time updates
- Shared types via `@btv/types`

## Game Statuses

- `GameStatus` includes `OPEN` — use `gameIsAvailable()` to check for reservable games (covers both `CREATED` and `OPEN`)
- `GameStatusFilter` includes `includeOpen` — enabled by default

## API Response Shapes

- `getSchedulesToday()` in `api.ts` flattens backend `{ schedule, games }` response to flat `ScheduleSection` shape
- Components consume `ScheduleSection` directly (never the raw nested backend format)

## Date Display

- Use utils from `src/lib/utils.ts`: `formatDateTime()`, `formatDate()`, `formatTime()`, `formatTimeAgo()`
- These auto-convert UTC ISO strings to browser local timezone — no manual conversion needed
- When sending dates to backend: always UTC ISO 8601

## Text Overflow

- Use `<TruncatedText>` from `@/components/truncated-text` for variable-length text (usernames, titles, profile values). Uses native `title` attr (long-press) — no Radix dep on mobile since hover tooltips don't work on touch.
- Pair with `flex-1 min-w-0` on flex text children and `shrink-0` on action siblings so `truncate` can clip.
