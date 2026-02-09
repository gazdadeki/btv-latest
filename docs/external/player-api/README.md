# Player API Integration Pack

This pack documents the **player-facing** API surface for third-party
applications. It includes a filtered OpenAPI spec, a Postman collection,
and a concise integration guide.

## Base URL and versioning

- Base URL: `http://<host>:<port>`
- API versioning: `/api/v1`

All HTTP endpoints are rooted under `/api/v1`.

## Authentication (cookie-based JWT)

This API uses **HTTP-only cookies** for player authentication.

- Login or register sets two cookies:
  - `admin_access_token` (short-lived access token)
  - `admin_refresh_token` (longer-lived refresh token)
- Clients must send cookies with each request.

Example (fetch):

```
fetch('http://localhost:3000/api/v1/auth/login', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
```

### Third-party cookie warning

Modern browsers can block third-party cookies. If your app is hosted on a
different site, prefer a **first-party** setup (reverse proxy or shared
domain) so cookies are accepted.

## Verification and bans

Many player endpoints require:

- **Verified account** (403 `User must be verified`)
- **Not banned** (403 with ban reason)

Use:

- `POST /api/v1/verification/request`
- `POST /api/v1/verification/verify`

The verification endpoint enforces rate limits (429) to prevent abuse.

## Error model

Errors are returned in a consistent shape:

```
{
  "statusCode": 403,
  "message": "User must be verified",
  "error": "ForbiddenException",
  "details": [...], // only for validation errors
  "timestamp": "2026-01-18T12:34:56.789Z",
  "path": "/api/v1/players/games/available",
  "method": "GET"
}
```

Validation errors return `statusCode: 400` with `details`.

## Player endpoint groups

The OpenAPI spec and Postman collection in this pack include only the
player-relevant endpoints. High-level groups:

- **Auth**: `/api/v1/auth/*`
- **Verification**: `/api/v1/verification/*`
- **Players / Games / Schedules**: `/api/v1/players/*`
- **Reservations**: `/api/v1/players/reservations/*`
- **Messaging**: `/api/v1/messages/*` (admin-only messaging actions excluded)
- **Tutorials**: `/api/v1/players/tutorials/*`
- **Wallet**: `/api/v1/players/wallet*`
- **Subscriptions**: `/api/v1/players/subscription*`
- **Stripe payments**: `/api/v1/players/stripe/*`
- **Statistics**: `/api/v1/players/statistics/my`
- **Notifications / Devices**: `/api/v1/players/devices*`,
  `/api/v1/players/notifications/*`

## Realtime (Socket.IO, optional)

Players can connect to Socket.IO using a JWT access token:

1. Call `GET /api/v1/auth/websocket-token` (requires cookies).
2. Connect with `auth.token` or `Authorization: Bearer <token>`.

Player-relevant event names are defined in `src/websocket/events.ts`. New
features may use the optional envelope shape from ADR 0003:

```
{
  "type": "game:status_changed",
  "version": "v1",
  "timestamp": "2026-01-18T12:34:56.789Z",
  "correlationId": "uuid",
  "payload": { ... }
}
```

## Postman usage

1. Import `postman/collection.v1.json`.
2. Import `postman/environment.example.json` and set `baseUrl`.
3. Call `POST /api/v1/auth/login` to store cookies in Postman.
4. Use the remaining requests; cookies are sent automatically.

## Regenerating this pack

Run the npm scripts added in `package.json` after the API server is running
(Swagger enabled in non-production). By default, the exporter reads from
`http://localhost:3000/api-json`.

Commands:

- `npm run docs:export:player-pack`
- `npm run docs:export:openapi`
- `npm run docs:export:postman`

Optional overrides (example):

`node scripts/export-player-api.js --base-url http://localhost:3000 --openapi-path /api-json`
