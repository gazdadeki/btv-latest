import { DataSource } from 'typeorm';
import type { LogLevel } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

config();

const shouldSynchronize = process.env.TYPEORM_SYNCHRONIZE === 'true';
const maxQueryExecutionTime = Number.parseInt(
  process.env.TYPEORM_MAX_QUERY_MS || '0',
  10,
);
const enableSlowQueryLogging =
  Number.isFinite(maxQueryExecutionTime) && maxQueryExecutionTime > 0;
const isDev = process.env.NODE_ENV === 'development';
const logLevels: LogLevel[] = isDev
  ? ['query', 'error', 'warn']
  : enableSlowQueryLogging
    ? ['error', 'warn']
    : ['error'];

export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST!,
  port: parseInt(process.env.DB_PORT!, 10),
  username: process.env.DB_USERNAME!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_DATABASE!,
  entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
  migrations: [join(__dirname, 'migrations/*{.ts,.js}')],
  synchronize: shouldSynchronize,
  timezone: 'Z',
  maxQueryExecutionTime: enableSlowQueryLogging
    ? maxQueryExecutionTime
    : undefined,
  logging: logLevels,
  migrationsTableName: 'migrations',
});
