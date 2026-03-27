---
paths:
  - "apps/backend/src/**/*entity*.ts"
  - "apps/backend/src/**/*Entity*.ts"
  - "apps/backend/src/database/**/*.ts"
---

# Database & TypeORM Rules

## Entity Conventions
- Table names: plural, snake_case (`@Entity('game_sessions')`)
- Column names: snake_case (`@Column({ name: 'start_time' })`)
- Primary key: `id` (auto-generated)
- Foreign keys: `*_id` pattern (`game_id`, `user_id`)
- InnoDB engine, utf8mb4 charset

## Date/Time — CRITICAL
- ALL datetime columns stored as UTC
- TypeORM configured with `timezone: 'Z'`
- ALWAYS use UTC JS methods: `setUTCHours()`, `getUTCDate()`, `getUTCFullYear()`
- NEVER use local methods: `setHours()`, `getDate()`, `getFullYear()`
- Use date utils from `src/common/date.utils.ts`: `utcStartOfDay()`, `utcEndOfDay()`, `toUtcDateString()`

## Migrations
- NEVER modify existing migration files — they are immutable
- Always create NEW migrations for schema changes
- Run: `npm run migration:generate -- -n MigrationName` in apps/backend
- Test migrations with: `npm run migration:run`

## Query Patterns
- Always use prepared statements / parameterized queries
- Avoid N+1 queries — use `leftJoinAndSelect` or `QueryBuilder` with joins
- Paginate large result sets — never return unbounded collections
