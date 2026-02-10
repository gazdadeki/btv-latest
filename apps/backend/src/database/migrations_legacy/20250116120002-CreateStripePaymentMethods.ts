import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStripePaymentMethods20250116120002 implements MigrationInterface {
  name = 'CreateStripePaymentMethods20250116120002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`stripe_payment_methods\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`stripePaymentMethodId\` varchar(255) NOT NULL, \`type\` varchar(255) NOT NULL, \`last4\` varchar(255) NULL, \`brand\` varchar(255) NULL, \`expMonth\` int NULL, \`expYear\` int NULL, \`isDefault\` tinyint NOT NULL DEFAULT 0, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_stripe_payment_methods_userId\` (\`userId\`), UNIQUE INDEX \`IDX_stripe_payment_methods_stripePaymentMethodId\` (\`stripePaymentMethodId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`stripe_payment_methods\` ADD CONSTRAINT \`FK_stripe_payment_methods_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`stripe_payment_methods\` DROP FOREIGN KEY \`FK_stripe_payment_methods_userId\``,
    );
    await queryRunner.query(`DROP TABLE \`stripe_payment_methods\``);
  }
}
