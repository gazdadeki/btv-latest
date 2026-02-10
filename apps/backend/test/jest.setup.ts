import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

const envTestPath = resolve(process.cwd(), '.env.test');

if (existsSync(envTestPath)) {
  config({ path: envTestPath });
} else {
  config();
}

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

process.env.TYPEORM_SYNCHRONIZE = 'false';

const dbName = process.env.DB_DATABASE;
if (!dbName) {
  throw new Error(
    'DB_DATABASE must be set for tests (use a dedicated *_test schema).',
  );
}
if (!dbName.toLowerCase().includes('test')) {
  throw new Error(
    `Refusing to run tests against non-test database: ${dbName}.`,
  );
}
