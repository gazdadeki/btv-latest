---
name: review-pr
description: Review a pull request for code quality, security, and convention adherence
user-invocable: true
argument-hint: "[pr-number]"
allowed-tools: Read, Grep, Glob, Bash
---

# Review Pull Request #$ARGUMENTS

## Gather Context
1. Fetch the PR details: `gh pr view $ARGUMENTS --json title,body,files,additions,deletions`
2. Get the full diff: `gh pr diff $ARGUMENTS`
3. List changed files: `gh pr diff $ARGUMENTS --name-only`

## Review Checklist

For each changed file, check:

### Code Quality
- [ ] No `any` types — use proper TypeScript types
- [ ] No unused imports or variables
- [ ] Functions are focused and not overly long
- [ ] Error handling is appropriate

### Security (OWASP)
- [ ] No SQL injection (must use parameterized queries / TypeORM)
- [ ] No XSS vulnerabilities (user input escaped in templates)
- [ ] Auth guards applied to protected endpoints
- [ ] No secrets or credentials in code
- [ ] Cookie names match convention (`admin_*` or `player_*`)

### Project Conventions
- [ ] Dates use UTC methods only (backend: `setUTCHours`, `getUTCDate`, etc.)
- [ ] TypeORM entities: snake_case tables/columns, plural table names
- [ ] DTOs use class-validator decorators
- [ ] Frontend date display uses utils from `lib/utils.ts`

### Architecture
- [ ] Changes are in the right layer (controller vs service vs entity)
- [ ] No cross-app imports (web shouldn't import from mobile, etc.)
- [ ] Shared types go in `@btv/types` package

## Output
Provide a structured review with:
- **Summary**: What the PR does
- **Issues**: Specific problems with file:line references
- **Suggestions**: Improvements (non-blocking)
- **Verdict**: Approve / Request Changes / Comment
