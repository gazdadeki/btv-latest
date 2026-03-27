#!/bin/bash
# PostToolUse hook: Auto-format files after Edit/Write with Prettier
# Reads the tool input from stdin (JSON) to get the file path

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.filePath // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only format files Prettier can handle
case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx|*.json|*.css|*.md|*.html|*.yaml|*.yml)
    npx prettier --write "$FILE_PATH" 2>/dev/null
    ;;
esac

exit 0
