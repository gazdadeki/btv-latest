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

## Date Display
- Use utils from `src/lib/utils.ts`: `formatDateTime()`, `formatDate()`, `formatTime()`, `formatTimeAgo()`
- When sending dates to backend: always UTC ISO 8601
