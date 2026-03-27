---
paths:
  - "apps/backend/src/**/*.ts"
---

# Backend API Rules (NestJS)

## Module Pattern
- Controllers handle HTTP only — no business logic
- Services contain business logic and data access
- All incoming data validated via DTOs with class-validator decorators
- Use constructor injection for dependencies

## Endpoint Conventions
- Global prefix: `api` with URI versioning (`/api/v1/...`)
- Use guards for auth: `@UseGuards(JwtAuthGuard)`, `@UseGuards(AdminGuard)`
- Use `@ApiTags()` and Swagger decorators for documentation
- Return consistent response shapes

## Error Handling
- Throw NestJS built-in exceptions: `NotFoundException`, `BadRequestException`, `UnauthorizedException`
- Never expose internal error details to clients
- Use parameterized queries — never concatenate user input into SQL

## File Organization
- One module per feature directory
- DTOs in `dto/` subdirectory
- Entities in `entities/` subdirectory
- Register all modules in `app.module.ts`
