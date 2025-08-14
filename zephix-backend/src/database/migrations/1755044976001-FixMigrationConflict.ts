import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixMigrationConflict1755044976001 implements MigrationInterface {
  name = 'FixMigrationConflict1755044976001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔧 Starting migration conflict resolution...');

    // Check if organizationId column exists in users table
    const organizationIdExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'organizationId'
      )
    `);

    if (organizationIdExists[0].exists) {
      console.log('✅ organizationId column already exists in users table');
    } else {
      console.log('➕ Adding organizationId column to users table');
      await queryRunner.query(`
        ALTER TABLE "users" 
        ADD COLUMN "organizationId" character varying
      `);
    }

    // Check if role column exists in users table
    const roleExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'role'
      )
    `);

    if (roleExists[0].exists) {
      console.log('✅ role column already exists in users table');
    } else {
      console.log('➕ Adding role column to users table');
      await queryRunner.query(`
        ALTER TABLE "users" 
        ADD COLUMN "role" character varying NOT NULL DEFAULT 'user'
      `);
    }

    // Check if profilePicture column exists in users table
    const profilePictureExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'profilePicture'
      )
    `);

    if (profilePictureExists[0].exists) {
      console.log('✅ profilePicture column already exists in users table');
    } else {
      console.log('➕ Adding profilePicture column to users table');
      await queryRunner.query(`
        ALTER TABLE "users" 
        ADD COLUMN "profilePicture" character varying
      `);
    }

    // Check if refresh_tokens table exists
    const refreshTokensExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'refresh_tokens'
      )
    `);

    if (refreshTokensExists[0].exists) {
      console.log('✅ refresh_tokens table already exists');
    } else {
      console.log('➕ Creating refresh_tokens table');
      await queryRunner.query(`
        CREATE TABLE "refresh_tokens" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
          "token" character varying NOT NULL, 
          "expiresAt" TIMESTAMP NOT NULL, 
          "isRevoked" boolean NOT NULL DEFAULT false, 
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
          "userId" uuid, 
          CONSTRAINT "UQ_4542dd2f38a61354a040ba9fd57" UNIQUE ("token"), 
          CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id")
        )
      `);

      // Add foreign key constraint
      await queryRunner.query(`
        ALTER TABLE "refresh_tokens" 
        ADD CONSTRAINT "FK_610102b60fea1455310ccd299de" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      `);
    }

    console.log('🎉 Migration conflict resolution completed successfully!');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Rolling back migration conflict resolution...');

    // Drop refresh_tokens table if it exists
    const refreshTokensExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'refresh_tokens'
      )
    `);

    if (refreshTokensExists[0].exists) {
      console.log('🗑️ Dropping refresh_tokens table');
      await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    }

    // Remove columns if they exist
    const columnsToRemove = ['profilePicture', 'role', 'organizationId'];
    
    for (const column of columnsToRemove) {
      const columnExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = '${column}'
        )
      `);

      if (columnExists[0].exists) {
        console.log(`🗑️ Removing ${column} column from users table`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "${column}"`);
      }
    }

    console.log('🔄 Rollback completed');
  }
}
