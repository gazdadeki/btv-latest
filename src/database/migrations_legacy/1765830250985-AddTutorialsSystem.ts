import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTutorialsSystem1765830250985 implements MigrationInterface {
  name = 'AddTutorialsSystem1765830250985';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`tags\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(255) NOT NULL, \`slug\` varchar(255) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_b3aa10c29ea4e61a830362bd25\` (\`slug\`), UNIQUE INDEX \`IDX_d90243459a697eadb8ad56e909\` (\`name\`), UNIQUE INDEX \`IDX_d90243459a697eadb8ad56e909\` (\`name\`), UNIQUE INDEX \`IDX_b3aa10c29ea4e61a830362bd25\` (\`slug\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`categories\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(255) NOT NULL, \`slug\` varchar(255) NOT NULL, \`description\` text NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_420d9f679d41281f282f5bc7d0\` (\`slug\`), UNIQUE INDEX \`IDX_8b0be371d28245da6e4f4b6187\` (\`name\`), UNIQUE INDEX \`IDX_8b0be371d28245da6e4f4b6187\` (\`name\`), UNIQUE INDEX \`IDX_420d9f679d41281f282f5bc7d0\` (\`slug\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`tutorials\` (\`id\` int NOT NULL AUTO_INCREMENT, \`title\` varchar(255) NOT NULL, \`slug\` varchar(255) NOT NULL, \`body\` text NOT NULL, \`excerpt\` text NULL, \`status\` enum ('DRAFT', 'PUBLISHED') NOT NULL DEFAULT 'DRAFT', \`featured\` tinyint NOT NULL DEFAULT 0, \`viewCount\` int NOT NULL DEFAULT '0', \`authorId\` int NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_bef4e44103663196a54cb3a90d\` (\`createdAt\`), INDEX \`IDX_bec7943763f21464a62de8a475\` (\`authorId\`), INDEX \`IDX_88c17d1de9bae3ce197bb20fd9\` (\`featured\`), INDEX \`IDX_2a38a03e22984b5231824f071b\` (\`status\`), UNIQUE INDEX \`IDX_3fd5fbbddcff2f6116b66eebf3\` (\`slug\`), UNIQUE INDEX \`IDX_3fd5fbbddcff2f6116b66eebf3\` (\`slug\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`tutorial_tags\` (\`tutorialId\` int NOT NULL, \`tagId\` int NOT NULL, INDEX \`IDX_cd2b23f406bdd4fdc6425580f0\` (\`tutorialId\`), INDEX \`IDX_6980357863a8d75ce195f98260\` (\`tagId\`), PRIMARY KEY (\`tutorialId\`, \`tagId\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`tutorial_categories\` (\`tutorialId\` int NOT NULL, \`categoryId\` int NOT NULL, INDEX \`IDX_7febafb664241fd1afb4d5e508\` (\`tutorialId\`), INDEX \`IDX_de36f539d41678ab61253957ba\` (\`categoryId\`), PRIMARY KEY (\`tutorialId\`, \`categoryId\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`tutorials\` ADD CONSTRAINT \`FK_bec7943763f21464a62de8a475d\` FOREIGN KEY (\`authorId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`tutorial_tags\` ADD CONSTRAINT \`FK_cd2b23f406bdd4fdc6425580f09\` FOREIGN KEY (\`tutorialId\`) REFERENCES \`tutorials\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE \`tutorial_tags\` ADD CONSTRAINT \`FK_6980357863a8d75ce195f98260a\` FOREIGN KEY (\`tagId\`) REFERENCES \`tags\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`tutorial_categories\` ADD CONSTRAINT \`FK_7febafb664241fd1afb4d5e5087\` FOREIGN KEY (\`tutorialId\`) REFERENCES \`tutorials\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE \`tutorial_categories\` ADD CONSTRAINT \`FK_de36f539d41678ab61253957baf\` FOREIGN KEY (\`categoryId\`) REFERENCES \`categories\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`tutorial_categories\` DROP FOREIGN KEY \`FK_de36f539d41678ab61253957baf\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`tutorial_categories\` DROP FOREIGN KEY \`FK_7febafb664241fd1afb4d5e5087\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`tutorial_tags\` DROP FOREIGN KEY \`FK_6980357863a8d75ce195f98260a\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`tutorial_tags\` DROP FOREIGN KEY \`FK_cd2b23f406bdd4fdc6425580f09\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`tutorials\` DROP FOREIGN KEY \`FK_bec7943763f21464a62de8a475d\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_de36f539d41678ab61253957ba\` ON \`tutorial_categories\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_7febafb664241fd1afb4d5e508\` ON \`tutorial_categories\``,
    );
    await queryRunner.query(`DROP TABLE \`tutorial_categories\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_6980357863a8d75ce195f98260\` ON \`tutorial_tags\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_cd2b23f406bdd4fdc6425580f0\` ON \`tutorial_tags\``,
    );
    await queryRunner.query(`DROP TABLE \`tutorial_tags\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_3fd5fbbddcff2f6116b66eebf3\` ON \`tutorials\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_3fd5fbbddcff2f6116b66eebf3\` ON \`tutorials\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_2a38a03e22984b5231824f071b\` ON \`tutorials\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_88c17d1de9bae3ce197bb20fd9\` ON \`tutorials\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_bec7943763f21464a62de8a475\` ON \`tutorials\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_bef4e44103663196a54cb3a90d\` ON \`tutorials\``,
    );
    await queryRunner.query(`DROP TABLE \`tutorials\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_420d9f679d41281f282f5bc7d0\` ON \`categories\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_8b0be371d28245da6e4f4b6187\` ON \`categories\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_8b0be371d28245da6e4f4b6187\` ON \`categories\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_420d9f679d41281f282f5bc7d0\` ON \`categories\``,
    );
    await queryRunner.query(`DROP TABLE \`categories\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_b3aa10c29ea4e61a830362bd25\` ON \`tags\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_d90243459a697eadb8ad56e909\` ON \`tags\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_d90243459a697eadb8ad56e909\` ON \`tags\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_b3aa10c29ea4e61a830362bd25\` ON \`tags\``,
    );
    await queryRunner.query(`DROP TABLE \`tags\``);
  }
}
