import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to rename events table to games and update all related foreign keys and column names.
 *
 * Changes:
 * - Renames `events` table to `games`
 * - Renames `eventId` column to `gameId` in `slots` table
 * - Renames `eventId` column to `gameId` in `reservations` table
 * - Updates all foreign key constraint names
 * - Updates all index names that reference 'events'
 */
export class RenameEventsToGames20251214214129 implements MigrationInterface {
  name = 'RenameEventsToGames20251214214129';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Helper function to safely drop foreign key if it exists
    const dropForeignKeyIfExists = async (
      tableName: string,
      fkName: string,
    ) => {
      const result = await queryRunner.query(`
                SELECT CONSTRAINT_NAME 
                FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = '${tableName}' 
                AND CONSTRAINT_NAME = '${fkName}'
                AND CONSTRAINT_TYPE = 'FOREIGN KEY'
            `);
      if (result.length > 0) {
        await queryRunner.query(
          `ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${fkName}\``,
        );
      }
    };

    // Helper function to safely drop index if it exists
    const dropIndexIfExists = async (tableName: string, indexName: string) => {
      const result = await queryRunner.query(`
                SELECT INDEX_NAME 
                FROM INFORMATION_SCHEMA.STATISTICS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = '${tableName}' 
                AND INDEX_NAME = '${indexName}'
            `);
      if (result.length > 0) {
        await queryRunner.query(
          `DROP INDEX \`${indexName}\` ON \`${tableName}\``,
        );
      }
    };

    // Step 1: Drop foreign key constraints that reference events table (if they exist)
    await dropForeignKeyIfExists('slots', 'FK_665c6a54ef9c49866a7bfa21bcd');
    await dropForeignKeyIfExists(
      'reservations',
      'FK_c6fda79964e4d3a3e3f9843fbc1',
    );

    // Step 2: Rename eventId columns to gameId (if they exist)
    const slotsHasEventId = await queryRunner.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'slots' 
            AND COLUMN_NAME = 'eventId'
        `);
    if (slotsHasEventId.length > 0) {
      await queryRunner.query(
        `ALTER TABLE \`slots\` CHANGE \`eventId\` \`gameId\` int NOT NULL`,
      );
    }

    const reservationsHasEventId = await queryRunner.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'reservations' 
            AND COLUMN_NAME = 'eventId'
        `);
    if (reservationsHasEventId.length > 0) {
      await queryRunner.query(
        `ALTER TABLE \`reservations\` CHANGE \`eventId\` \`gameId\` int NOT NULL`,
      );
    }

    // Step 3: Rename events table to games (if it exists)
    const eventsTableExists = await queryRunner.query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'events'
        `);
    if (eventsTableExists.length > 0) {
      await queryRunner.query(`RENAME TABLE \`events\` TO \`games\``);
    }

    // Step 4: Recreate foreign key constraints with new names (if they don't already exist)
    const slotsHasGameIdFk = await queryRunner.query(`
            SELECT CONSTRAINT_NAME 
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'slots' 
            AND CONSTRAINT_NAME = 'FK_slots_gameId'
            AND CONSTRAINT_TYPE = 'FOREIGN KEY'
        `);
    if (slotsHasGameIdFk.length === 0) {
      await queryRunner.query(
        `ALTER TABLE \`slots\` ADD CONSTRAINT \`FK_slots_gameId\` FOREIGN KEY (\`gameId\`) REFERENCES \`games\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
      );
    }

    const reservationsHasGameIdFk = await queryRunner.query(`
            SELECT CONSTRAINT_NAME 
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'reservations' 
            AND CONSTRAINT_NAME = 'FK_reservations_gameId'
            AND CONSTRAINT_TYPE = 'FOREIGN KEY'
        `);
    if (reservationsHasGameIdFk.length === 0) {
      await queryRunner.query(
        `ALTER TABLE \`reservations\` ADD CONSTRAINT \`FK_reservations_gameId\` FOREIGN KEY (\`gameId\`) REFERENCES \`games\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
      );
    }

    // Step 5: Update index names if they reference 'events'
    await dropIndexIfExists('slots', 'IDX_665c6a54ef9c49866a7bfa21bc');
    const slotsHasGameIdIndex = await queryRunner.query(`
            SELECT INDEX_NAME 
            FROM INFORMATION_SCHEMA.STATISTICS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'slots' 
            AND INDEX_NAME = 'IDX_slots_gameId'
        `);
    if (slotsHasGameIdIndex.length === 0) {
      await queryRunner.query(
        `CREATE INDEX \`IDX_slots_gameId\` ON \`slots\` (\`gameId\`)`,
      );
    }

    await dropIndexIfExists('reservations', 'IDX_c6fda79964e4d3a3e3f9843fbc');
    const reservationsHasGameIdIndex = await queryRunner.query(`
            SELECT INDEX_NAME 
            FROM INFORMATION_SCHEMA.STATISTICS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'reservations' 
            AND INDEX_NAME = 'IDX_reservations_gameId'
        `);
    if (reservationsHasGameIdIndex.length === 0) {
      await queryRunner.query(
        `CREATE INDEX \`IDX_reservations_gameId\` ON \`reservations\` (\`gameId\`)`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse the migration: rename games back to events

    // Step 1: Drop foreign key constraints
    await queryRunner.query(
      `ALTER TABLE \`slots\` DROP FOREIGN KEY \`FK_slots_gameId\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`reservations\` DROP FOREIGN KEY \`FK_reservations_gameId\``,
    );

    // Step 2: Drop new indexes
    await queryRunner.query(
      `DROP INDEX \`IDX_reservations_gameId\` ON \`reservations\``,
    );
    await queryRunner.query(`DROP INDEX \`IDX_slots_gameId\` ON \`slots\``);

    // Step 3: Rename games table back to events
    await queryRunner.query(`RENAME TABLE \`games\` TO \`events\``);

    // Step 4: Rename gameId columns back to eventId
    await queryRunner.query(
      `ALTER TABLE \`slots\` CHANGE \`gameId\` \`eventId\` int NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`reservations\` CHANGE \`gameId\` \`eventId\` int NOT NULL`,
    );

    // Step 5: Recreate original foreign key constraints
    await queryRunner.query(
      `ALTER TABLE \`slots\` ADD CONSTRAINT \`FK_665c6a54ef9c49866a7bfa21bcd\` FOREIGN KEY (\`eventId\`) REFERENCES \`events\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`reservations\` ADD CONSTRAINT \`FK_c6fda79964e4d3a3e3f9843fbc1\` FOREIGN KEY (\`eventId\`) REFERENCES \`events\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    // Step 6: Recreate original indexes
    await queryRunner.query(
      `CREATE INDEX \`IDX_665c6a54ef9c49866a7bfa21bc\` ON \`slots\` (\`eventId\`)`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_c6fda79964e4d3a3e3f9843fbc\` ON \`reservations\` (\`eventId\`)`,
    );
  }
}
