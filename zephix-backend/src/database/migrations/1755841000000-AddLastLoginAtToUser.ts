import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddLastLoginAtToUser1755841000000 implements MigrationInterface {
  name = 'AddLastLoginAtToUser1755841000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'lastLoginAt',
        type: 'timestamp',
        isNullable: true,
        comment: 'Timestamp of user\'s last login'
      })
    );

    // Add index for performance
    await queryRunner.query(
      'CREATE INDEX "IDX_USERS_LAST_LOGIN" ON "users" ("lastLoginAt")'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index first
    await queryRunner.query('DROP INDEX "IDX_USERS_LAST_LOGIN"');
    
    // Drop column
    await queryRunner.dropColumn('users', 'lastLoginAt');
  }
}
