import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

/**
 * Migration to add game generation batch tracking columns to the games table.
 *
 * Adds:
 * - generationBatchId: UUID to group games generated in the same batch
 * - gameIndex: Index of game within the batch (1, 2, 3...)
 */
export class AddGameGenerationBatch20251226120000 implements MigrationInterface {
  name = 'AddGameGenerationBatch20251226120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add generationBatchId column
    await queryRunner.addColumn(
      'games',
      new TableColumn({
        name: 'generationBatchId',
        type: 'varchar',
        length: '36',
        isNullable: true,
        comment: 'UUID to group games generated in the same batch',
      }),
    );

    // Add gameIndex column
    await queryRunner.addColumn(
      'games',
      new TableColumn({
        name: 'gameIndex',
        type: 'int',
        isNullable: true,
        comment: 'Index of game within the batch (1, 2, 3...)',
      }),
    );

    // Add index on generationBatchId for efficient querying
    await queryRunner.createIndex(
      'games',
      new TableIndex({
        name: 'IDX_games_generationBatchId',
        columnNames: ['generationBatchId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove index
    await queryRunner.dropIndex('games', 'IDX_games_generationBatchId');

    // Remove columns
    await queryRunner.dropColumn('games', 'gameIndex');
    await queryRunner.dropColumn('games', 'generationBatchId');
  }
}
