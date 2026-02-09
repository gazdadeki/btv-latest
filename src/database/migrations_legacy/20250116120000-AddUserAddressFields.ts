import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserAddressFields20250116120000 implements MigrationInterface {
  name = 'AddUserAddressFields20250116120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`fullName\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`addressLine1\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`addressLine2\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`city\` varchar(100) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`state\` varchar(100) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`country\` varchar(100) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`zipcode\` varchar(20) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`zipcode\``);
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`country\``);
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`state\``);
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`city\``);
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP COLUMN \`addressLine2\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP COLUMN \`addressLine1\``,
    );
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`fullName\``);
  }
}
