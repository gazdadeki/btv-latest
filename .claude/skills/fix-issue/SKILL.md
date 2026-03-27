---
name: fix-issue
description: Fix a GitHub issue — read it, implement the fix, test, and commit
user-invocable: true
argument-hint: "[issue-number]"
allowed-tools: Read, Grep, Glob, Bash, Edit, Write, Agent
---

# Fix GitHub Issue #$ARGUMENTS

## Steps

1. **Read the issue**: `gh issue view $ARGUMENTS --json title,body,labels,comments`
2. **Understand scope**: Identify which app(s) are affected (backend, web, mobile)
3. **Explore code**: Find the relevant files and understand the current behavior
4. **Implement fix**: Make the minimum changes needed to resolve the issue
5. **Test**: Run `npm run build` and `npm run test` to verify nothing is broken
6. **Commit**: Create a commit with message format: `fix: #$ARGUMENTS — <brief description>`

## Rules
- Prefer small, targeted fixes over refactors
- Follow all project conventions (UTC dates, snake_case DB, auth cookies)
- Do NOT generate tests unless the issue specifically requests them
- If the fix requires a database migration, use `/db-migrate` skill
- If unsure about the approach, ask before implementing
