import dataSource from './data-source';

const confirmationFlag = '--i-know-what-im-doing';

async function resetDatabase() {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const hasConfirmation =
    process.argv.includes(confirmationFlag) ||
    process.env.npm_config_i_know_what_im_doing === 'true';

  if (!isDevelopment) {
    throw new Error(
      'Database reset is only allowed when NODE_ENV=development.',
    );
  }

  if (!hasConfirmation) {
    throw new Error(
      `Database reset requires explicit confirmation: ${confirmationFlag}`,
    );
  }

  if (process.env.TYPEORM_SYNCHRONIZE === 'true') {
    throw new Error(
      'Disable TYPEORM_SYNCHRONIZE before resetting and running migrations.',
    );
  }

  await dataSource.initialize();

  try {
    console.log('⚠ Dropping all tables in the database...');
    await dataSource.dropDatabase();
    console.log('✓ Database cleared. Running migrations...');
    await dataSource.runMigrations();
    console.log('✓ Migrations completed.');
  } finally {
    await dataSource.destroy();
  }
}

resetDatabase().catch((error) => {
  console.error('Database reset failed:', error);
  process.exit(1);
});
