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

- Dark gaming theme applies to every authenticated `(app)` route. Body bg is `#0f0e0c` set in `(app)/layout.tsx`.
- Top-level pages use `<PageHeader label icon rightAction? />` from `src/components/page-header.tsx` for their title bar. Icons are from `react-icons/gi` (Game Icons set) to match the gaming aesthetic; labels should align with the bottom-nav tab labels.
- Bottom nav labels: Arena (`/home`), Messages, Settings, Store (`/shop`), Guide (`/tutorials`). Keep page titles in sync if nav labels change.
- Gaming frame assets live in `public/frames/` (e.g. `game-card-border.png` used for cards and filter chips, `footer-border-bcg.png` used for the bottom nav). Apply via inline `backgroundImage` + `backgroundSize: 100% 100%`.
- Shared dark utilities in `globals.css`:
  - `.panel-dark` — main card surface (gradient bg, subtle inset highlight)
  - `.panel-sunken` — nested/form panel, no outer shadow
  - `.row-divider` — horizontal separator matching the dark palette
  - `.btn-dark-secondary` — muted secondary button for dark pages
  - `.auth-input` — dark form input (shared with auth pages)
  - `.auth-link` — teal inline link
  - `.arena-header` — top-of-page banner (also used on secondary pages like wallet/subscription history as a back-button header)
- Color conventions on dark surfaces: primary text `#f0f0f0`, body/secondary `#c0b8a8`-`#e0d8c8`, muted `#8a8a8a`, disabled/icons `#6a6a6a`, dividers `#2a2620`. Gold `#c9a84c` for brand/active accents, teal `#2a9d8f` for CTAs (Reserve, Send, links).

## Text Overflow

- Use `<TruncatedText text={...} className="..." />` from `@/components/truncated-text` for any variable-length text (usernames, stream/game labels, profile values). Uses native `title` attribute (long-press on touch devices) — intentionally no Radix dep since hover tooltips don't work on touch.
- Pair with `flex-1 min-w-0` on flex children so `truncate` can actually clip. Parent flex containers with action buttons should give the action side `shrink-0` and the text side `flex-1 min-w-0`.

## Reserve button availability

- Free users can only reserve once a game transitions to `OPEN`. During `CREATED`, the home list shows a "Locked" badge and the game-details Reserve button is rendered but `disabled` (so the affordance is visible — unlock is imminent).
- Gold users can reserve from `CREATED` onward (gold-first rule).

## Slot Card UI (Game Details)

- Each slot row uses the `game-card-border.png` frame (same as home cards); fixed height `h-14` so rows don't collapse when they have no action button.
- Circle colors (bg of the slot-number avatar):
  - `#9c3e3b` brick red — admin reserved
  - `#3d8f5f` forest emerald — own confirmed
  - `blue-500` — own pending
  - `gray-400` — reserved by other player
  - `#c9a84c` gold — gold-only unreserved (matches the "Gold Only" label)
  - `#2a9d8f` teal — free unreserved (matches the Reserve button)
- Username text: own `#f0f0f0`, admin `#c45a57` (lighter crimson), other players `#a89f8e`.
- Own-slot sub-label: tiny teal `Pending` under the username when reservation is not yet confirmed; nothing when confirmed (green circle already signals it).
- Actions per state:
  - Unreserved free → teal `Reserve` button (Button `primary`, `min-w-[104px]`)
  - Unreserved gold-only (viewer is gold) → gold `Reserve` button (Button `gold`, same size)
  - Unreserved gold-only (viewer is free) → inline "Gold Only" label + star, no button
  - Own pending → gold `Confirm` button + round X icon (brick red `#9c3e3b`) for Leave
  - Own confirmed → round X icon only (confirmed = "locked in", Leave demoted)
  - Reserved by someone else → no action buttons
  - Locked (game in progress/finished/cancelled) → "Locked" muted text for unreserved slots
- Reserve/Confirm button sizing: `size="sm"` + `min-w-[104px]` + `text-xs font-bold uppercase tracking-wider` so every row's CTA occupies the same visual slot.
- Team A / B section headers use shared `#2a2620` divider; team color lives on the text (`text-red-500` / `text-green-500`), not on the border.
- Toasts: `closeButton`, `swipeToDismiss`, 3s auto-dismiss.

## Messages (constants)

- `MESSAGES.reservation.alreadyInGame` — banner shown when user already has a slot in the current game (renamed from `cannotReserve`, which was always a fallback for this case).

## Development

- Dev server binds to `0.0.0.0` (not `localhost`) for LAN testing from mobile devices
- Push notifications require HTTPS or `localhost` — won't work via LAN IP on mobile Chrome without `chrome://flags` override
