/**
 * Export Admin API Documentation
 *
 * Generates OpenAPI specs for admin-facing endpoints (everything NOT in
 * the player-facing subset). Useful for internal documentation.
 *
 * Usage:
 *   node scripts/export-admin-api.js                         # fetch from running server
 *   node scripts/export-admin-api.js --openapi-file <path>   # read from file
 */

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

const DEFAULT_BASE_URL = 'http://localhost:3000';
const DEFAULT_OPENAPI_PATH = '/api-json';
const OUTPUT_DIR = path.resolve(
  __dirname,
  '..',
  'docs',
  'internal',
  'admin-api',
);
const API_VERSION = 'v1';

function getArgValue(name) {
  const directMatch = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (directMatch) {
    return directMatch.split('=').slice(1).join('=');
  }
  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1) {
    return process.argv[index + 1];
  }
  return undefined;
}

const OPENAPI_FILE = getArgValue('openapi-file') || process.env.OPENAPI_FILE;

// Player-facing prefixes (to exclude from admin spec)
const PLAYER_PREFIXES = ['/auth/', '/verification/', '/players/', '/messages/'];
const PLAYER_DENY_PREFIXES = ['/verification/admin/'];
const PLAYER_DENY_PATHS = new Set([
  '/messages/conversations/from-admin',
  '/messages/conversations/{id}/admins',
]);

function normalizePath(openApiPath) {
  return openApiPath.replace(/^\/api\/v\d+\//, '/').replace(/^\/api\//, '/');
}

function isPlayerPath(openApiPath) {
  const normalized = normalizePath(openApiPath);
  // Paths denied from player export are admin paths
  if (PLAYER_DENY_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return false;
  }
  if (PLAYER_DENY_PATHS.has(normalized)) {
    return false;
  }
  return PLAYER_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function filterAdminSpec(openApiSpec) {
  const filteredPaths = {};
  Object.keys(openApiSpec.paths || {}).forEach((openApiPath) => {
    if (!isPlayerPath(openApiPath)) {
      filteredPaths[openApiPath] = openApiSpec.paths[openApiPath];
    }
  });

  const usedTags = new Set();
  Object.values(filteredPaths).forEach((operations) => {
    Object.values(operations || {}).forEach((operation) => {
      (operation.tags || []).forEach((tag) => usedTags.add(tag));
    });
  });

  const filteredTags = (openApiSpec.tags || []).filter((tag) =>
    usedTags.has(tag.name),
  );

  return {
    ...openApiSpec,
    info: {
      ...openApiSpec.info,
      title: 'BTV Admin API',
      version: openApiSpec.info?.version || API_VERSION,
      description:
        'Admin-facing endpoints. Requires ADMIN role. For internal use only.',
    },
    servers: [
      {
        url: '{baseUrl}',
        variables: {
          baseUrl: {
            default: DEFAULT_BASE_URL,
          },
        },
      },
    ],
    paths: filteredPaths,
    tags: filteredTags,
  };
}

function ensureDirectories() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function writeYaml(filePath, data) {
  fs.writeFileSync(filePath, yaml.stringify(data));
}

async function fetchOpenApiSpec(baseUrl, openApiPath) {
  const trimmedBase = baseUrl.replace(/\/$/, '');
  const url = `${trimmedBase}${openApiPath}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch OpenAPI spec (${response.status} ${url})`);
  }
  return response.json();
}

async function main() {
  const baseUrl =
    getArgValue('base-url') || process.env.API_BASE_URL || DEFAULT_BASE_URL;
  const openApiPath =
    getArgValue('openapi-path') ||
    process.env.OPENAPI_PATH ||
    DEFAULT_OPENAPI_PATH;

  let openApiSpec;
  if (OPENAPI_FILE) {
    console.log(`[docs:admin] Reading OpenAPI from ${OPENAPI_FILE}`);
    openApiSpec = JSON.parse(fs.readFileSync(OPENAPI_FILE, 'utf-8'));
  } else {
    console.log(`[docs:admin] Fetching OpenAPI from ${baseUrl}${openApiPath}`);
    openApiSpec = await fetchOpenApiSpec(baseUrl, openApiPath);
  }

  const adminSpec = filterAdminSpec(openApiSpec);

  ensureDirectories();

  const jsonPath = path.join(OUTPUT_DIR, `openapi.${API_VERSION}.json`);
  const yamlPath = path.join(OUTPUT_DIR, `openapi.${API_VERSION}.yaml`);

  writeJson(jsonPath, adminSpec);
  writeYaml(yamlPath, adminSpec);

  const pathCount = Object.keys(adminSpec.paths).length;
  const tagCount = adminSpec.tags.length;
  console.log(`[docs:admin] Wrote ${pathCount} paths across ${tagCount} tags`);
  console.log(`[docs:admin] ${jsonPath}`);
  console.log(`[docs:admin] ${yamlPath}`);
}

main().catch((error) => {
  console.error(`[docs:admin] Export failed: ${error.message}`);
  process.exitCode = 1;
});
