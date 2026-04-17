import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSchedulerLocks1768000000000 implements MigrationInterface {
  name = 'AddSchedulerLocks1768000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`scheduler_locks\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(191) NOT NULL, \`locked_until\` datetime(6) NOT NULL, \`locked_by\` varchar(191) NOT NULL, \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`UQ_scheduler_locks_name\` (\`name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `scheduler_locks`');
  }
}
