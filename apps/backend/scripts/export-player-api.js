const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const { convert } = require('openapi-to-postmanv2');

const DEFAULT_BASE_URL = 'http://localhost:3000';
const DEFAULT_OPENAPI_PATH = '/api-json';
const OUTPUT_DIR = path.resolve(__dirname, '..', 'docs', 'external', 'player-api');
const POSTMAN_DIR = path.join(OUTPUT_DIR, 'postman');
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

const EXPORT_TARGET = getArgValue('target') || process.env.DOCS_TARGET || 'all';
const OPENAPI_FILE = getArgValue('openapi-file') || process.env.OPENAPI_FILE;

const ALLOWED_PREFIXES = ['/auth/', '/verification/', '/players/', '/messages/'];
const DENY_PREFIXES = ['/verification/admin/'];
const DENY_PATHS = new Set([
  '/messages/conversations/from-admin',
  '/messages/conversations/{id}/admins',
]);

function normalizePath(openApiPath) {
  return openApiPath
    .replace(/^\/api\/v\d+\//, '/')
    .replace(/^\/api\//, '/');
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

function filterOpenApiSpec(openApiSpec) {
  const filteredPaths = {};
  Object.keys(openApiSpec.paths || {}).forEach((openApiPath) => {
    if (isAllowedPath(openApiPath)) {
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
      title: 'BTV Player API',
      version: openApiSpec.info?.version || API_VERSION,
      description:
        openApiSpec.info?.description ||
        'Player-facing endpoints only. Cookie-based JWT auth is primary; Bearer auth is a fallback.',
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
  fs.mkdirSync(POSTMAN_DIR, { recursive: true });
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function writeYaml(filePath, data) {
  fs.writeFileSync(filePath, yaml.stringify(data));
}

function extractPathSuffix(rawUrl) {
  if (!rawUrl) {
    return '/';
  }
  if (rawUrl.startsWith('{{baseUrl}}')) {
    const suffix = rawUrl.replace('{{baseUrl}}', '');
    return suffix.startsWith('/') ? suffix : `/${suffix}`;
  }
  try {
    const url = new URL(rawUrl);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch (error) {
    const match = rawUrl.match(/^https?:\/\/[^/]+(\/.*)$/);
    if (match) {
      return match[1];
    }
  }
  return rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
}

function rewriteCollectionUrls(node) {
  if (!node || typeof node !== 'object') {
    return;
  }

  if (node.request && node.request.url) {
    const rawUrl =
      typeof node.request.url === 'string'
        ? node.request.url
        : node.request.url.raw || '';
    const suffix = extractPathSuffix(rawUrl);
    node.request.url = `{{baseUrl}}${suffix}`;
  }

  if (Array.isArray(node.item)) {
    node.item.forEach(rewriteCollectionUrls);
  }
}

async function convertToPostman(openApiSpec, outputPath) {
  return new Promise((resolve, reject) => {
    convert(
      { type: 'json', data: JSON.stringify(openApiSpec) },
      { folderStrategy: 'Tags', requestParametersResolution: 'Example' },
      (err, conversionResult) => {
        if (err || !conversionResult.result) {
          return reject(
            err || new Error(conversionResult.reason || 'Conversion failed'),
          );
        }

        const collection = conversionResult.output[0].data;
        collection.info.name = 'BTV Player API v1';
        collection.auth = { type: 'noauth' };

        rewriteCollectionUrls(collection);
        writeJson(outputPath, collection);
        return resolve();
      },
    );
  });
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
  const shouldWriteOpenApi = EXPORT_TARGET !== 'postman';
  const shouldWritePostman = EXPORT_TARGET !== 'openapi';

  let openApiSpec;
  if (OPENAPI_FILE) {
    console.log(`[docs] Reading OpenAPI from ${OPENAPI_FILE}`);
    openApiSpec = JSON.parse(fs.readFileSync(OPENAPI_FILE, 'utf-8'));
  } else {
    console.log(`[docs] Fetching OpenAPI from ${baseUrl}${openApiPath}`);
    openApiSpec = await fetchOpenApiSpec(baseUrl, openApiPath);
  }
  const playerSpec = filterOpenApiSpec(openApiSpec);

  ensureDirectories();

  const jsonPath = path.join(OUTPUT_DIR, `openapi.${API_VERSION}.json`);
  const yamlPath = path.join(OUTPUT_DIR, `openapi.${API_VERSION}.yaml`);
  const postmanPath = path.join(
    POSTMAN_DIR,
    `collection.${API_VERSION}.json`,
  );

  if (shouldWriteOpenApi) {
    writeJson(jsonPath, playerSpec);
    writeYaml(yamlPath, playerSpec);
    console.log(`[docs] Wrote ${jsonPath}`);
    console.log(`[docs] Wrote ${yamlPath}`);
  }

  if (shouldWritePostman) {
    await convertToPostman(playerSpec, postmanPath);
    console.log(`[docs] Wrote ${postmanPath}`);
  }
}

main().catch((error) => {
  console.error(`[docs] Export failed: ${error.message}`);
  process.exitCode = 1;
});
