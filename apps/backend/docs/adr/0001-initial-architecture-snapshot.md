# 0001 - Initial architecture snapshot

## Context
- The application is a single NestJS app under `src/` with feature modules per domain (see `src/app.module.ts`).
- HTTP API routing uses a global `api` prefix with URI versioning (default `v1`) configured in `src/main.ts`.
- Global request validation is strict (`whitelist: true`, `forbidNonWhitelisted: true`) in `src/main.ts`.
- Persistence uses TypeORM with a MySQL data source defined in `src/database/data-source.ts`.
- Static assets are served from `public/`, including admin pages under `public/admin/`.
- WebSocket support is provided via Socket.IO modules in `src/websocket/`.

## Decision
Adopt the current architecture as the baseline:
- Keep the single NestJS application with domain-focused modules under `src/`.
- Preserve URI-based API versioning and the `/api/v1` routing convention.
- Maintain strict request validation at the boundary.
- Keep static assets under `public/` and serve them via the NestJS app.

## Consequences
- New features should be added as NestJS modules/services consistent with the existing layout.
- Backward compatibility for API changes should respect the existing `/api/v1` contract (new versions require explicit versioning changes).
- DTO validation remains mandatory for request payloads to align with the global validation pipe.
