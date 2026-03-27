---
name: deploy-check
description: Run pre-deployment verification across all apps
user-invocable: true
allowed-tools: Bash, Read, Glob
---

# Pre-Deployment Verification

Run all checks to verify the project is ready for deployment.

## Checks

1. **Uncommitted changes**: `git status` — warn if there are uncommitted changes
2. **Build all apps**: `npm run build` — must pass with zero errors
3. **Lint all apps**: `npm run lint` — must pass with zero errors
4. **Run tests**: `npm run test` — must pass
5. **TypeScript check**: Verify no type errors across all packages
6. **Environment**: Check `.env.example` exists and list required variables
7. **Dependencies**: `npm audit --production` — report any high/critical vulnerabilities

## Output

Provide a clear pass/fail report:

```text
Deploy Check Results
====================
[ PASS ] No uncommitted changes
[ PASS ] Build successful (all 3 apps)
[ PASS ] Lint clean
[ PASS ] Tests passing
[ WARN ] 2 moderate npm vulnerabilities
[ INFO ] Required env vars: DATABASE_URL, JWT_SECRET, STRIPE_KEY, ...
```
