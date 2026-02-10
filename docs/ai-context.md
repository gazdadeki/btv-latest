# AI Context — BTV (Turborepo Monorepo)

This document records verified, repo-based facts to avoid repeated discovery in future sessions.

## Project overview

- Event scheduling and reservation system with admin and public-facing frontends.
- Key feature areas: auth, scheduling, reservations, subscriptions, Stripe payments, WebSocket updates, Firebase notifications, audit logging, admin APIs, messaging, tutorials.

## Tech stack

- Runtime: Node.js 22+
- Monorepo: Turborepo (`turbo` v2), npm workspaces
- Backend: NestJS 11, TypeScript, TypeORM (MySQL), JWT auth, Socket.IO, Stripe, Firebase Admin, Nodemailer
- Web: Next.js 15 (App Router), React 19, Tailwind CSS v4, shadcn/ui patterns, TanStack Table, Socket.IO client, Sonner (toasts)
- Shared packages: `@btv/types` (shared TypeScript interfaces/enums), `@btv/tsconfig` (shared TS configs)

## Repository layout

```
btv/
├── apps/
│   ├── backend/          # NestJS API server (port 3000)
│   │   ├── src/          # NestJS feature modules
│   │   ├── public/       # Static assets (.well-known, etc.)
│   │   ├── docs/         # Backend-specific docs and ADRs
│   │   └── .env          # Backend environment variables
│   └── web/              # Next.js unified frontend (port 3001)
│       ├── src/app/      # App Router pages and layouts
│       │   ├── admin/    # Admin dashboard (authenticated)
│       │   ├── downloads/    # Public downloads page
│       │   └── reset-password/ # Public password reset
│       ├── src/lib/      # API client, auth, websocket, utils
│       ├── src/components/ # Shared UI components
│       └── .env.local    # Web environment variables
├── packages/
│   ├── tsconfig/         # Shared TypeScript configurations
│   └── types/            # Shared TypeScript types and enums
├── deploy/               # Production deployment configs (nginx example)
├── turbo.json            # Turborepo task configuration
└── package.json          # Root workspace config
```

## Dev workflow

- `npm run dev` — starts all apps (backend + web) via Turbo
- `npm run dev:backend` — backend only
- `npm run dev:web` — web frontend only
- `npm run build` — builds all apps
- Migration scripts are in `apps/backend/package.json`

## Backend runtime behavior (apps/backend/src/main.ts)

- `.env` loaded explicitly at startup; process exits on failure.
- Required env vars validated via `EnvValidationService`.
- Global prefix: `api` with URI versioning (`/api/v1/...`).
- CORS: configurable via `CORS_ORIGINS` env var (comma-separated), defaults to reflect-origin.
- WebSocket CORS: same `CORS_ORIGINS` env var, defaults to `*`.
- Static assets served from `public/` (for `.well-known` deep linking files).
- Stripe webhook: raw body handling at `/api/v1/stripe/webhook`.
- Swagger: available at `/api` in non-production.

## Web frontend architecture (apps/web/)

- Single Next.js App Router app serving both admin and public pages
- No basePath — routes are filesystem-based:
  - `/admin/*` — admin dashboard (protected by middleware)
  - `/downloads` — public downloads page
  - `/reset-password` — public password reset page
  - `/` — redirects to `/admin`
- API calls proxied via Next.js rewrites (`/api/*` → backend `/api/*`)
- Cookie-based auth (JWT access + refresh tokens)
- WebSocket connection via Socket.IO client (direct to backend)
- Route protection via Next.js middleware (only `/admin/*` routes)
- Auth state via React context (`AuthProvider` / `useAuth`)
- Admin pages: Dashboard, Calendar, Users, Schedules, Games, Subscriptions, Tutorials, Stripe Products, Messages, Audit Log

## Production deployment

- Two standalone processes: backend (:3000), web (:3001)
- Nginx reverse proxy routes by path prefix (see `deploy/nginx.conf.example`)
- `/api/*`, `/socket.io/*`, `/.well-known/*` → backend
- Everything else → web (Next.js)

## Data access

- TypeORM `DataSource` with MySQL, entities/migrations from `src/`
- `synchronize` controlled by `TYPEORM_SYNCHRONIZE` (defaults to false)

## Known constraints

- Legacy `frontend/admin-ui/` directory contains reference source files from the old Vite+React+jQuery admin UI (kept for reference, not built)
