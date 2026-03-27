---
name: db-migrate
description: Generate a new TypeORM migration for the backend database
user-invocable: true
argument-hint: "[migration-name]"
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---

# Generate a New TypeORM Migration

Generate a new TypeORM migration named `$ARGUMENTS` for the BaltazarTV backend.

## Steps

1. **Understand the change**: Read the relevant entity files in `apps/backend/src/` to understand what schema changes are needed
2. **Check existing migrations**: List files in `apps/backend/src/database/migrations/` to see the naming pattern and latest timestamp
3. **Generate the migration**: Run the migration generation command from `apps/backend/`:
   ```bash
   cd apps/backend && npx ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:generate -d src/database/data-source.ts src/database/migrations/$ARGUMENTS
   ```
4. **Review the generated SQL**: Read the new migration file and verify:
   - Table/column names use snake_case
   - DATETIME columns will store UTC
   - Foreign keys follow `*_id` pattern
   - InnoDB engine and utf8mb4 charset are used
5. **Report**: Show the migration file contents and explain what it will do

## Critical Rules
- NEVER modify an existing migration file
- All datetime columns must be UTC
- Table names: plural, snake_case
- Column names: snake_case
