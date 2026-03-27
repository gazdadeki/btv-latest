# Mobile PWA (Next.js)

## Architecture

- Next.js 15 App Router PWA for players
- `@ducanh2912/next-pwa` v10 — disabled in dev, enabled in production
- Route groups: `(app)/` for authenticated, `(auth)/` for public

## Auth

- Cookie-based: `player_user` cookie read by middleware (`src/middleware.ts`)
- Unauthenticated → `/login`, unverified → `/verification`, authenticated on auth route → `/home`
- `AuthProvider` / `useAuth()` React context for auth state

## Data

- TanStack Query v5 for server state
- Stripe JS for payments
- Socket.IO client for real-time updates
- Shares types via `@btv/types`

## Date Display Utils

- `src/lib/utils.ts`: `formatDateTime()`, `formatDate()`, `formatTime()`, `formatTimeAgo()`
