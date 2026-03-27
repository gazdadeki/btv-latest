/**
 * CI Spec Drift Detection
 *
 * Boots the NestJS app (from dist/), generates the current OpenAPI spec,
 * filters it for player-facing endpoints using the same rules as
 * export-player-api.js, and compares against the committed spec.
 *
 * Exits with code 1 if the specs differ (meaning docs need regenerating).
 *
 * Usage:
 *   node scripts/check-spec-drift.js
 *
 * Prerequisites:
 *   - `npm run build` must have been run (needs dist/)
 *   - Database must be reachable (TypeORM connects on bootstrap)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const COMMITTED_SPEC_PATH = path.resolve(
  __dirname,
  '..',
  'docs',
  'external',
  'player-api',
  'openapi.v1.json',
);

// ── Same filter rules as export-player-api.js ──────────────────────────

const ALLOWED_PREFIXES = [
  '/auth/',
  '/verification/',
  '/players/',
  '/messages/',
];
const DENY_PREFIXES = ['/verification/admin/'];
const DENY_PATHS = new Set([
  '/messages/conversations/from-admin',
  '/messages/conversations/{id}/admins',
]);

function normalizePath(openApiPath) {
  return openApiPath.replace(/^\/api\/v\d+\//, '/').replace(/^\/api\//, '/');
}

function isAllowedPath(openApiPath) {
  const normalized = normalizePath(openApiPath);
  if (DENY_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return false;
  }
  if (DENY_PATHS.has(normalized)) {
    return false;
  }
  return ALLOWED_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function filterPaths(spec) {
  const filtered = {};
  for (const p of Object.keys(spec.paths || {})) {
    if (isAllowedPath(p)) {
      filtered[p] = spec.paths[p];
    }
  }
  return filtered;
}

function collectRefs(obj, refs = new Set()) {
  if (!obj || typeof obj !== 'object') return refs;
  if (obj.$ref && typeof obj.$ref === 'string') {
    const match = obj.$ref.match(/^#\/components\/schemas\/(.+)$/);
    if (match) refs.add(match[1]);
  }
  for (const value of Object.values(obj)) {
    collectRefs(value, refs);
  }
  return refs;
}

function pruneSchemas(filteredPaths, allSchemas) {
  // Walk filtered paths to find all directly and transitively referenced schemas
  const reachable = new Set();
  const queue = [...collectRefs(filteredPaths)];
  while (queue.length) {
    const name = queue.pop();
    if (reachable.has(name) || !allSchemas[name]) continue;
    reachable.add(name);
    for (const ref of collectRefs(allSchemas[name])) {
      if (!reachable.has(ref)) queue.push(ref);
    }
  }
  const pruned = {};
  for (const name of [...reachable].sort()) {
    pruned[name] = allSchemas[name];
  }
  return pruned;
}

// ── Main ───────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(COMMITTED_SPEC_PATH)) {
    console.error(
      '[spec-drift] Committed spec not found. Run `npm run docs:export:openapi` first.',
    );
    process.exitCode = 1;
    return;
  }

  const backendRoot = path.resolve(__dirname, '..');
  const distEntry = path.join(backendRoot, 'dist', 'app.module.js');

  if (!fs.existsSync(distEntry)) {
    console.log('[spec-drift] dist/ not found — building...');
    execSync('npm run build', { cwd: backendRoot, stdio: 'inherit' });
  }

  // Generate full OpenAPI spec by booting the app in a child process
  // Script must live inside backendRoot so require() resolves node_modules and ./dist
  const tempDir = fs.mkdtempSync(path.join(backendRoot, '.spec-drift-'));
  const tempSpecPath = path.join(tempDir, 'openapi.v1.json');

  const generatorScript = `
    const { NestFactory } = require('@nestjs/core');
    const { DocumentBuilder, SwaggerModule } = require('@nestjs/swagger');
    const { VersioningType } = require('@nestjs/common');
    const { AppModule } = require('./dist/app.module');
    const fs = require('fs');

    (async () => {
      const app = await NestFactory.create(AppModule, { logger: false });
      app.setGlobalPrefix('api');
      app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

      const config = new DocumentBuilder()
        .setTitle('BaltazarTV API')
        .setDescription('--')
        .setVersion('1.0')
        .addBearerAuth()
        .build();

      const document = SwaggerModule.createDocument(app, config);
      fs.writeFileSync(process.env.SPEC_OUTPUT, JSON.stringify(document, null, 2));
      await app.close();
      process.exit(0);
    })().catch(e => { console.error(e.message); process.exit(1); });
  `;

  const tmpScript = path.join(tempDir, 'generate-spec.js');
  fs.writeFileSync(tmpScript, generatorScript);

  console.log('[spec-drift] Generating current OpenAPI spec...');
  try {
    execSync(`node ${tmpScript}`, {
      cwd: backendRoot,
      stdio: 'inherit',
      timeout: 60000,
      env: { ...process.env, SPEC_OUTPUT: tempSpecPath },
    });
  } catch (err) {
    console.error('[spec-drift] Failed to generate spec:', err.message);
    process.exitCode = 1;
    return;
  } finally {
    try {
      fs.unlinkSync(tmpScript);
    } catch {
      // ignore
    }
  }

  if (!fs.existsSync(tempSpecPath)) {
    console.error('[spec-drift] Spec file was not written.');
    process.exitCode = 1;
    return;
  }

  const fullSpec = JSON.parse(fs.readFileSync(tempSpecPath, 'utf-8'));
  const currentPaths = filterPaths(fullSpec);
  const currentSchemas = pruneSchemas(
    currentPaths,
    fullSpec.components?.schemas || {},
  );

  const committedSpec = JSON.parse(
    fs.readFileSync(COMMITTED_SPEC_PATH, 'utf-8'),
  );
  const committedPaths = committedSpec.paths || {};
  const committedSchemas = committedSpec.components?.schemas || {};

  let hasDrift = false;

  // Compare paths (keys + content)
  const currentPathKeys = Object.keys(currentPaths).sort();
  const committedPathKeys = Object.keys(committedPaths).sort();

  const addedPaths = currentPathKeys.filter(
    (p) => !committedPathKeys.includes(p),
  );
  const removedPaths = committedPathKeys.filter(
    (p) => !currentPathKeys.includes(p),
  );

  if (addedPaths.length || removedPaths.length) {
    console.error('[spec-drift] PATH DRIFT DETECTED');
    if (addedPaths.length) console.error('  Added:', addedPaths);
    if (removedPaths.length) console.error('  Removed:', removedPaths);
    hasDrift = true;
  } else if (JSON.stringify(currentPaths) !== JSON.stringify(committedPaths)) {
    console.error('[spec-drift] PATH CONTENT DRIFT DETECTED');
    const changed = currentPathKeys.filter(
      (p) =>
        JSON.stringify(currentPaths[p]) !== JSON.stringify(committedPaths[p]),
    );
    if (changed.length) console.error('  Changed:', changed);
    hasDrift = true;
  }

  // Compare schemas (keys + content)
  const currentSchemaKeys = Object.keys(currentSchemas).sort();
  const committedSchemaKeys = Object.keys(committedSchemas).sort();

  const addedSchemas = currentSchemaKeys.filter(
    (s) => !committedSchemaKeys.includes(s),
  );
  const removedSchemas = committedSchemaKeys.filter(
    (s) => !currentSchemaKeys.includes(s),
  );

  if (addedSchemas.length || removedSchemas.length) {
    console.error('[spec-drift] SCHEMA DRIFT DETECTED');
    if (addedSchemas.length) console.error('  Added:', addedSchemas);
    if (removedSchemas.length) console.error('  Removed:', removedSchemas);
    hasDrift = true;
  } else if (
    JSON.stringify(currentSchemas) !== JSON.stringify(committedSchemas)
  ) {
    console.error('[spec-drift] SCHEMA CONTENT DRIFT DETECTED');
    const changed = currentSchemaKeys.filter(
      (s) =>
        JSON.stringify(currentSchemas[s]) !==
        JSON.stringify(committedSchemas[s]),
    );
    if (changed.length) console.error('  Changed:', changed);
    hasDrift = true;
  }

  // Cleanup
  try {
    fs.rmSync(tempDir, { recursive: true });
  } catch {
    // ignore
  }

  if (hasDrift) {
    console.error('\n[spec-drift] Committed spec is out of date.');
    console.error(
      '[spec-drift] Run `npm run docs:export:openapi` and commit the changes.',
    );
    process.exitCode = 1;
  } else {
    console.log('[spec-drift] No drift detected — spec is up to date.');
  }
}

main().catch((error) => {
  console.error(`[spec-drift] ${error.message}`);
  process.exitCode = 1;
});
