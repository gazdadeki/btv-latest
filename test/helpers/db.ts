import { DataSource } from 'typeorm';
import AppDataSource from '@/database/data-source';

let dataSource: DataSource | null = null;

export async function getDataSource(): Promise<DataSource> {
  if (dataSource?.isInitialized) {
    return dataSource;
  }
  dataSource = AppDataSource;
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }
  return dataSource;
}

export async function runMigrations(): Promise<void> {
  const source = await getDataSource();
  await source.runMigrations();
}

export async function truncateAllTables(): Promise<void> {
  const source = await getDataSource();
  const tableNames = source.entityMetadatas.map((meta) => meta.tableName);
  if (tableNames.length === 0) {
    return;
  }
  const queryRunner = source.createQueryRunner();
  await queryRunner.connect();
  try {
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0;');
    for (const tableName of tableNames) {
      await queryRunner.query(`TRUNCATE TABLE \`${tableName}\`;`);
    }
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1;');
  } finally {
    await queryRunner.release();
  }
}

export async function destroyDataSource(): Promise<void> {
  if (dataSource?.isInitialized) {
    await dataSource.destroy();
  }
  dataSource = null;
}
