# 0002 - TypeORM synchronize policy

## Context
- The TypeORM data source currently enables `synchronize: true`, which can mutate schema at runtime.
- The repo already supports migrations (`npm run migration:run`) and a migrations table.
- We want safe defaults for production and consistent schema changes across environments.

## Decision
- Default `synchronize` to **false** in all environments.
- Allow explicit **local/dev opt-in** via an environment variable (e.g., `TYPEORM_SYNCHRONIZE=true`).
- Treat migrations as the canonical way to evolve the schema.

## Consequences
- Schema changes must be captured in migrations for shared environments.
- Developers can still opt in to `synchronize` locally when safe and intentional.
- Configuration files must document the new env var and defaults.
