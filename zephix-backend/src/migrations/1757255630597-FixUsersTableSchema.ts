import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixUsersTableSchema1757255630597 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if the table exists and has the wrong column names
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `);

    if (tableExists[0].exists) {
      // Check if we have the wrong column names
      const columns = await queryRunner.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name IN ('firstName', 'lastName');
      `);

      if (columns.length > 0) {
        // Rename columns from firstName/lastName to first_name/last_name
        await queryRunner.query(`
          ALTER TABLE users RENAME COLUMN "firstName" TO first_name;
        `);
        await queryRunner.query(`
          ALTER TABLE users RENAME COLUMN "lastName" TO last_name;
        `);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse the changes
    await queryRunner.query(`
      ALTER TABLE users RENAME COLUMN first_name TO "firstName";
    `);
    await queryRunner.query(`
      ALTER TABLE users RENAME COLUMN last_name TO "lastName";
    `);
  }
}
