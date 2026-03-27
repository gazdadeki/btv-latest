#!/bin/bash
# PreToolUse hook: Block edits to existing migration files
# Migrations are immutable once created — generate new ones instead

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.filePath // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Check if the file is an existing migration
if [[ "$FILE_PATH" == *"database/migrations/"* ]]; then
  if [ -f "$FILE_PATH" ]; then
    echo "BLOCKED: Migration files are immutable. Create a NEW migration instead of modifying an existing one." >&2
    echo "Run: npm run migration:generate -- -n YourMigrationName (in apps/backend)" >&2
    exit 2
  fi
fi

exit 0
