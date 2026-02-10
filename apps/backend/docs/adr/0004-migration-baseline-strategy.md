# 0004 - Migration baseline and reset strategy

## Context
- The migration set drifted over time with multiple overlapping baseline files and mixed conventions.
- Fresh environments failed because some migrations depended on tables that were never created.
- A custom migration runner masked errors by suppressing failures and marking migrations as executed.

## Decision
- Establish a single canonical baseline migration for the current schema.
- Archive legacy migrations in `src/database/migrations_legacy/` and exclude them from execution.
- Enforce `synchronize=false` by default and rely on migrations for schema changes.
- Provide a dev-only reset command that drops the schema and re-runs migrations with explicit confirmation.

## Consequences
- New environments bootstrap from the baseline migration without relying on `synchronize`.
- Future schema changes must be captured in new migrations.
- Legacy migrations remain available for reference but are no longer executed.
