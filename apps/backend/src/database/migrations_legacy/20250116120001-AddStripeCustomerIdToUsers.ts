import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStripeCustomerIdToUsers20250116120001 implements MigrationInterface {
  name = 'AddStripeCustomerIdToUsers20250116120001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`stripeCustomerId\` varchar(255) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP COLUMN \`stripeCustomerId\``,
    );
  }
}
