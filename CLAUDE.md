# BTV — Project Instructions

## Project Overview

Event scheduling and reservation system. Turborepo monorepo with three apps:

- `apps/backend` — NestJS 11 API server (port 3000)
- `apps/web` — Next.js 15 admin dashboard (port 3001)
- `apps/mobile` — Next.js 15 PWA player-facing app (port 3002)
- `packages/types` — shared TypeScript types (@btv/types)
- `packages/tsconfig` — shared TS configs (base, nestjs, nextjs)

## Tech Stack

- Runtime: Node.js 22+, npm workspaces, Turborepo v2
- Backend: NestJS 11, TypeORM (MySQL), JWT auth, Socket.IO, Stripe, Firebase Admin, Nodemailer
- Web: Next.js 15 App Router, React 19, Tailwind CSS v4, shadcn/ui, TanStack Table, Socket.IO client
- Mobile: Next.js 15 App Router, React 19, Tailwind CSS v4, @ducanh2912/next-pwa v10, TanStack Query v5, Stripe JS
- Formatting: Prettier (singleQuote: true, trailingComma: all)
- Testing: Jest with ts-jest (backend only)

## Dev Commands

- `npm run dev` — starts all three apps via Turbo
- `npm run dev:backend` / `npm run dev:web` / `npm run dev:mobile` — individual apps
- `npm run build` — builds all apps
- Migration scripts in `apps/backend/package.json`

## Critical Conventions

### Date & Time — ALL dates are UTC

- All DATETIME columns stored/read as UTC (TypeORM `timezone: 'Z'`)
- Backend: ALWAYS use UTC JS methods (`setUTCHours()`, `getUTCDate()`, etc.), NEVER local-timezone equivalents (`setHours()`, `getDate()`, etc.)
- Backend date utils: `apps/backend/src/common/date.utils.ts` — `utcStartOfDay()`, `utcEndOfDay()`, `toUtcDateString()`
- Frontend: convert ISO strings to local timezone for display using existing utils
- Frontend sending dates: always UTC ISO 8601. Use `localTimeToUtc()`/`utcTimeToLocal()` from utils

### Auth Cookie Strategy

Two separate cookie namespaces prevent session collision between admin and player apps:

|                                  | Admin app (apps/web)  | Player app (apps/mobile) |
| -------------------------------- | --------------------- | ------------------------ |
| Access token (HTTP-only)         | `admin_access_token`  | `player_access_token`    |
| Refresh token (HTTP-only)        | `admin_refresh_token` | `player_refresh_token`   |
| User indicator (client-readable) | `admin_user`          | `player_user`            |

- JWT strategy checks `player_access_token` first, then `admin_access_token`, then `Authorization` header
- Logout clears all cookies

### SQL / TypeORM Conventions

- Plural table names (snake_case), camelCase column names (TypeORM default — no `name:` overrides)
- Primary key: `id`, foreign keys: `*Id` pattern (e.g., `scheduleId`, `userId`)
- Always use migrations for schema changes (never modify production schema manually)
- InnoDB engine, utf8mb4 charset
- Always use prepared statements / parameterized queries
- Avoid N+1 queries, paginate large result sets

## Behavioral Rules

- Do NOT generate tests unless explicitly requested
- Prefer small, incremental refactors over large rewrites
- Flag when a decision affects architecture, stack, or conventions — propose recording as ADR in `docs/`
- Do not re-propose rejected approaches
- Prefer TypeScript strict mode, avoid `any`

## Git Commit Rules

- Before every commit, review staged files and verify no build artifacts or generated files are included
- Never commit: `sw.js`, `workbox-*.js`, `swe-worker-*.js` (PWA build output), `.next/`, `dist/`, `node_modules/`, `*.tsbuildinfo`
- If a generated file is tracked by git, propose adding it to `.gitignore` and removing from tracking before committing
- Stage files explicitly by name — avoid `git add -A` or `git add .` which can catch unintended files
- At commit time, automatically update documentation (`CLAUDE.md`, `.claude/rules/`, `docs/ai-context.md`, app-level `CLAUDE.md` files) when staged code changes affect conventions, architecture, module structure, or API contracts — use senior-engineer judgment about what warrants a doc update; don't over-document trivial changes

## Production Deployment

- Three standalone processes: backend (:3000), web (:3001), mobile (:3002)
- Mobile PWA on separate domain from admin app in production
- Nginx routes: `/api/*`, `/socket.io/*`, `/.well-known/*` → backend; admin domain → web; player domain → mobile

## Known Constraints

- Legacy `frontend/` directory: old Vite+React+jQuery admin UI kept for reference only, not built or deployed
- PWA service worker disabled in `NODE_ENV=development` (prevents stale cache)
- On localhost both apps share cookie domain across ports — dev-only limitation; production uses separate domains

## Detailed Reference

See `docs/ai-context.md` for the full project context including complete backend module listing, detailed auth flows, and deployment topology.
