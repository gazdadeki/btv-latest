# Architecture Decision Records (ADR)

This directory stores Architecture Decision Records for BTV.

## When to write an ADR
Create an ADR when a change affects architecture or cross-cutting behavior, such as:
- API contracts or versioning strategy
- Persistence models or migration strategy
- AuthN/AuthZ approach
- Realtime/WebSocket protocol changes
- Background jobs, queues, or external integrations

## Naming & numbering
- Format: `NNNN-short-title.md` (e.g., `0001-initial-architecture-snapshot.md`)
- Numbers are sequential and never reused.

## Template
```
# NNNN - Title

## Context
What problem or situation led to this decision?

## Decision
What did we decide and why?

## Consequences
What are the trade-offs, follow-ups, or impacts?
```
