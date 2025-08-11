import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailVerificationColumns1700000000009 implements MigrationInterface {
  name = 'AddEmailVerificationColumns1700000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if the users table exists
    const usersTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
      )
    `);

    if (usersTableExists[0].exists) {
      // Check if isEmailVerified column exists
      const isEmailVerifiedExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'isEmailVerified'
        )
      `);

      if (!isEmailVerifiedExists[0].exists) {
        // Add isEmailVerified column
        await queryRunner.query(`
          ALTER TABLE "users" 
          ADD COLUMN "isEmailVerified" boolean NOT NULL DEFAULT false
        `);
        console.log('✅ Added isEmailVerified column to users table');
      } else {
        console.log('ℹ️  isEmailVerified column already exists in users table');
      }

      // Check if emailVerifiedAt column exists
      const emailVerifiedAtExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'emailVerifiedAt'
        )
      `);

      if (!emailVerifiedAtExists[0].exists) {
        // Add emailVerifiedAt column
        await queryRunner.query(`
          ALTER TABLE "users" 
          ADD COLUMN "emailVerifiedAt" timestamp
        `);
        console.log('✅ Added emailVerifiedAt column to users table');
      } else {
        console.log('ℹ️  emailVerifiedAt column already exists in users table');
      }
    } else {
      console.log('ℹ️  Users table does not exist, skipping column addition');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Check if the users table exists
    const usersTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
      )
    `);

    if (usersTableExists[0].exists) {
      // Remove isEmailVerified column if it exists
      const isEmailVerifiedExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'isEmailVerified'
        )
      `);

      if (isEmailVerifiedExists[0].exists) {
        await queryRunner.query(`
          ALTER TABLE "users" DROP COLUMN "isEmailVerified"
        `);
        console.log('✅ Removed isEmailVerified column from users table');
      }

      // Remove emailVerifiedAt column if it exists
      const emailVerifiedAtExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'emailVerifiedAt'
        )
      `);

      if (emailVerifiedAtExists[0].exists) {
        await queryRunner.query(`
          ALTER TABLE "users" DROP COLUMN "emailVerifiedAt"
        `);
        console.log('✅ Removed emailVerifiedAt column from users table');
      }
    }
  }
}
