---
paths:
  - "packages/types/src/**/*.ts"
---

# Shared Types Package Rules (@btv/types)

## Conventions
- Export all public types from `src/index.ts`
- Use TypeScript interfaces for data shapes, enums for fixed sets
- Prefix interfaces with descriptive names (not `I` prefix): `GameSession`, `PlayerProfile`
- Keep types aligned with backend entity definitions
- No runtime code — types and interfaces only
