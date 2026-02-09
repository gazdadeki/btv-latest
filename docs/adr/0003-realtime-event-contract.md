# 0003 - Realtime event contract and versioning

## Context
- WebSocket events are emitted across services with ad-hoc payloads.
- The project WebSockets rules require explicit message type, correlation ID, and timestamp, with versioned message types.
- We must preserve existing event names to avoid breaking current clients.

## Decision
- Centralize event names and payload interfaces in a shared module.
- Introduce an optional envelope for new emissions:
  - `type` (string)
  - `version` (e.g., `v1`)
  - `timestamp` (ISO string)
  - `correlationId` (UUID or request-scoped ID)
  - `payload` (typed payload)
- Keep existing events and payloads unchanged for backward compatibility; new envelope-based emissions are additive.

## Consequences
- New realtime features use the envelope by default.
- Legacy clients continue to receive existing events without changes.
- Observability improves via correlation IDs and consistent timestamps.
