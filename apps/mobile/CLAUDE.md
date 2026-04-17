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

## Push Notifications (FCM)

- Firebase Cloud Messaging for stream start notifications
- `src/lib/firebase.ts`: FCM client setup, token registration, foreground message listener
- `public/firebase-messaging-sw.js`: service worker for background notifications (hardcoded Firebase config — API keys are public/client-safe)
- On login: if permission already granted, registers silently; if not yet asked, shows a blue banner ("Get notified when streams go live!") with Enable/Later
- "Later" dismisses banner for 2 days (stored in localStorage); "Enable" triggers Chrome permission prompt and never shows again
- Foreground notifications render as styled toasts with "Watch Live" action button
- Background notifications show as OS-level notifications; clicking opens the stream URL
- URL validation: only `https://` URLs are opened from notification data
- Env vars: `NEXT_PUBLIC_FIREBASE_*` (API key, auth domain, project ID, storage bucket, messaging sender ID, app ID, VAPID key)

## Reservation Statuses

- `RESERVED` (was PENDING), `CONFIRMED`, `CANCELLED`, `EXPIRED` (was COMPLETED)
- `reservationIsActive()` checks for `RESERVED` or `CONFIRMED`

## Page Layout / Theming

- Top-level pages use `<PageHeader label icon rightAction? />` from `src/components/page-header.tsx` for their title bar. Icons are from `react-icons/gi` (Game Icons set) to match the gaming aesthetic; labels should align with the bottom-nav tab labels.
- Bottom nav labels: Arena (`/home`), Messages, Settings, Store (`/shop`), Guide (`/tutorials`). Keep page titles in sync if nav labels change.
- Gaming frame assets live in `public/frames/` (e.g. `game-card-border.png` used for cards and filter chips, `footer-border-bcg.png` used for the bottom nav). Apply via inline `backgroundImage` + `backgroundSize: 100% 100%`.
- Home route (`/home`) uses the dark page theme (`#0f0e0c`) — conditionally set on `(app)/layout.tsx` via `usePathname()`. Other `(app)` routes use `bg-gray-50`.

## Reserve button availability

- Free users can only reserve once a game transitions to `OPEN`. During `CREATED`, the home list shows a "Locked" badge and the game-details Reserve button is rendered but `disabled` (so the affordance is visible — unlock is imminent).
- Gold users can reserve from `CREATED` onward (gold-first rule).

## Slot Card UI (Game Details)

- Circle colors: red=admin, green=own confirmed, blue=own pending, gray=other player, amber=gold-only unreserved, indigo=free unreserved
- Admin usernames displayed in red text
- Unreserved slots show "Position N" label; reserved slots show username only
- No "Occupied" label — reserved slots by others are implicitly disabled (no action buttons)
- Toasts: `closeButton`, `swipeToDismiss`, 3s auto-dismiss

## Development

- Dev server binds to `0.0.0.0` (not `localhost`) for LAN testing from mobile devices
- Push notifications require HTTPS or `localhost` — won't work via LAN IP on mobile Chrome without `chrome://flags` override
