# Testing

This repository uses Jest for unit and e2e tests. Tests assume a **dedicated test database** and will truncate tables between tests.

## Environment setup

Create a `.env.test` (recommended) or export the following variables before running tests:

- `NODE_ENV=test`
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`
- `DB_DATABASE` must include `test` (for example: `btv_test`)
- `JWT_SECRET`, `JWT_ACCESS_TOKEN_EXPIRY`, `JWT_REFRESH_TOKEN_EXPIRY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `TYPEORM_SYNCHRONIZE=false` (use migrations for tests)

Optional but useful for local runs:

- `EMAIL_SERVICE_PROVIDER=console`

## Running tests

- Unit tests: `npm test`
- E2E + integration tests: `npm run test:e2e`

## Remote database (required)

Tests require a dedicated remote/shared MySQL or Percona database. The test
runner **truncates all entity tables** between tests, so do not point to any
shared or production data.

Recommended minimum setup (run on the remote database server):

```
CREATE DATABASE btv_test;

CREATE USER 'btv_app'@'%' IDENTIFIED BY 'change_me';
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON btv_test.* TO 'btv_app'@'%';
FLUSH PRIVILEGES;
```

Then create `.env.test` with:

- `DB_HOST` pointing to the remote DB
- `DB_DATABASE` containing `test` (for example: `btv_test`)

Notes:

- Tests run migrations on the configured test database and **truncate all entity tables** between tests.
- The Jest setup refuses to run if `DB_DATABASE` does not contain `test`.
- WebSocket tests use `socket.io-client` and require a valid JWT from `/api/v1/auth/websocket-token`.
- Stripe webhook tests use signed payloads; you can use dummy test keys locally.

## Performance baseline (non-prod)

Collect these before and after performance changes:

- **API latency**: p95/p99 for key endpoints (players + admin).
- **Cron duration**: total runtime for scheduled jobs (event generation, confirmation checks).
- **WebSocket load**: messages/sec and payload sizes during cron runs.

Recommended visibility tools:

- **MySQL/Percona slow query log**: enable in non-prod with a low `long_query_time` (200–500ms) to capture slow queries.
- **TypeORM slow query logging**: set `TYPEORM_MAX_QUERY_MS` (e.g., `200`) to log slow queries in app logs.
