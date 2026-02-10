# Database Migrations

This directory contains TypeORM migration files.

## Initial Setup

### Bootstrap a new database

This repo includes a canonical baseline migration (`1766000000000-InitialSchema.ts`). To bootstrap a fresh database, make sure the database exists and is empty, then run:

```bash
npm run migration:run
```

### Legacy migrations

Older, duplicate, or drifted migrations have been archived to `src/database/migrations_legacy/` and are not executed by TypeORM.

## Running Migrations

```bash
# Generate a new migration from entity changes
npm run migration:generate -- src/database/migrations/MigrationName

# Create an empty migration file (for custom SQL)
npm run migration:create -- src/database/migrations/MigrationName

# Run all pending migrations
npm run migration:run

# Show migration status
npm run migration:show

# Revert last migration
npm run migration:revert

# Reset database in development (requires NODE_ENV=development)
npm run migration:reset -- --i-know-what-im-doing
```

## Migration Naming Convention

TypeORM automatically prefixes migrations with a timestamp. Use descriptive names:

Example: `1234567890123-InitialSchema.ts` or `1234567890123-AddUserEmailIndex.ts`

## Troubleshooting

### "No migrations are pending"

- This means either:
  1. No migration files exist yet (generate initial migration first)
  2. All migrations have already been run
  3. Check `migrations` table in database to see what's been executed

### "Migration already executed"

- The migration has already been run. Check the `migrations` table in your database.

### "Cannot find module" errors

- Make sure you're running from the project root
- Ensure all entity files are properly exported
- Check that `data-source.ts` paths are correct
