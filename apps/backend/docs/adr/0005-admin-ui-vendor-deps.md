# 0005 - Bundle admin UI legacy dependencies

**Status: Superseded** — The legacy jQuery/AdminLTE admin UI has been replaced by a Next.js 15 app (`apps/web`). This ADR is retained for historical context only.

## Context

The admin UI relies on legacy jQuery plugins (DataTables) and AdminLTE/Bootstrap JS for
modals and layout. CDN-based loading proved fragile (e.g., `DataTable is not a function`
when the plugin is missing or attached to a different jQuery instance).

## Decision

Bundle jQuery, Bootstrap, AdminLTE, and DataTables inside the Vite admin UI build.
Remove CDN script tags for these dependencies and import their CSS in the build so
`public/admin/` serves a fully self-contained admin bundle.

## Consequences

- Admin UI bundles are larger, but predictable and self-contained.
- Deployments must rebuild `frontend/admin-ui` when admin UI dependencies change.
- Runtime failures due to CDN/network issues are reduced.
