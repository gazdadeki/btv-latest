---
name: new-module
description: Scaffold a new NestJS backend module following project conventions
user-invocable: true
argument-hint: "[module-name]"
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---

# Scaffold New NestJS Module: $ARGUMENTS

Create a new backend module following existing project patterns.

## Steps

1. **Study existing patterns**: Read a well-structured module (e.g., `apps/backend/src/games/`) to match conventions
2. **Create directory structure**:
   ```
   apps/backend/src/$ARGUMENTS/
   ├── $ARGUMENTS.module.ts
   ├── $ARGUMENTS.controller.ts
   ├── $ARGUMENTS.service.ts
   ├── dto/
   │   └── create-$ARGUMENTS.dto.ts
   └── entities/
       └── $ARGUMENTS.entity.ts
   ```
3. **Entity**: snake_case table name (plural), UTC datetimes, proper decorators
4. **DTO**: class-validator decorators for all fields
5. **Service**: inject Repository, implement CRUD methods
6. **Controller**: REST endpoints with proper guards, Swagger decorators, API versioning
7. **Module**: register entity, controller, service; export service
8. **Register**: Add the new module to `apps/backend/src/app.module.ts` imports
9. **Migration**: Generate migration for the new table using the db-migrate workflow

## Conventions
- Table name: plural snake_case (`$ARGUMENTS` → `module_names`)
- Primary key: `id` (auto-generated)
- Foreign keys: `*_id`
- All dates: UTC with `@Column({ type: 'datetime' })`
- Endpoints: `/api/v1/$ARGUMENTS`
