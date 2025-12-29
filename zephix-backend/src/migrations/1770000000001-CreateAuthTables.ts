import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migration: Create Auth Tables for Production Signup and Invites
 *
 * Creates:
 * - email_verification_tokens: Stores hashed verification tokens
 * - org_invites: Stores organization invitation tokens (hashed)
 * - auth_outbox: Stores email delivery events for retry logic
 *
 * Security:
 * - All tokens stored as hashes only (never plain text)
 * - Indexes on token_hash for fast lookups
 * - Foreign keys with CASCADE delete
 */
export class CreateAuthTables1770000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create email_verification_tokens table
    const emailVerificationTokensExists = await queryRunner.hasTable('email_verification_tokens');
    if (!emailVerificationTokensExists) {
      await queryRunner.createTable(
        new Table({
          name: 'email_verification_tokens',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'gen_random_uuid()',
            },
            {
              name: 'user_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'token_hash',
              type: 'varchar',
              length: '64', // HMAC-SHA256 hex = 64 chars
              isUnique: true,
              isNullable: false,
            },
            {
              name: 'expires_at',
              type: 'timestamp',
              isNullable: false,
            },
            {
              name: 'used_at',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'ip',
              type: 'varchar',
              length: '45',
              isNullable: true,
            },
            {
              name: 'user_agent',
              type: 'text',
              isNullable: true,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
          ],
          foreignKeys: [
            {
              columnNames: ['user_id'],
              referencedTableName: 'users',
              referencedColumnNames: ['id'],
              onDelete: 'CASCADE',
            },
          ],
        }),
        true,
      );

      await queryRunner.createIndex(
        'email_verification_tokens',
        new TableIndex({
          name: 'IDX_EMAIL_VERIFICATION_TOKEN_HASH',
          columnNames: ['token_hash'],
        }),
      );

      await queryRunner.createIndex(
        'email_verification_tokens',
        new TableIndex({
          name: 'IDX_EMAIL_VERIFICATION_USER_ID',
          columnNames: ['user_id'],
        }),
      );

      await queryRunner.createIndex(
        'email_verification_tokens',
        new TableIndex({
          name: 'IDX_EMAIL_VERIFICATION_EXPIRES_AT',
          columnNames: ['expires_at'],
        }),
      );
    }

    // 2. Create org_invites table
    const orgInvitesExists = await queryRunner.hasTable('org_invites');
    if (!orgInvitesExists) {
      await queryRunner.createTable(
        new Table({
          name: 'org_invites',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'gen_random_uuid()',
            },
            {
              name: 'org_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'email',
              type: 'varchar',
              length: '255',
              isNullable: false,
            },
            {
              name: 'role',
              type: 'varchar',
              length: '50',
              default: "'viewer'",
              isNullable: false,
            },
            {
              name: 'token_hash',
              type: 'varchar',
              length: '64', // HMAC-SHA256 hex = 64 chars
              isUnique: true,
              isNullable: false,
            },
            {
              name: 'expires_at',
              type: 'timestamp',
              isNullable: false,
            },
            {
              name: 'accepted_at',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'created_by',
              type: 'uuid',
              isNullable: false,
            },
          ],
          foreignKeys: [
            {
              columnNames: ['org_id'],
              referencedTableName: 'organizations',
              referencedColumnNames: ['id'],
              onDelete: 'CASCADE',
            },
            {
              columnNames: ['created_by'],
              referencedTableName: 'users',
              referencedColumnNames: ['id'],
              onDelete: 'CASCADE',
            },
          ],
        }),
        true,
      );

      await queryRunner.createIndex(
        'org_invites',
        new TableIndex({
          name: 'IDX_ORG_INVITES_TOKEN_HASH',
          columnNames: ['token_hash'],
        }),
      );

      await queryRunner.createIndex(
        'org_invites',
        new TableIndex({
          name: 'IDX_ORG_INVITES_ORG_ID',
          columnNames: ['org_id'],
        }),
      );

      await queryRunner.createIndex(
        'org_invites',
        new TableIndex({
          name: 'IDX_ORG_INVITES_EMAIL',
          columnNames: ['email'],
        }),
      );

      // Index for case-insensitive email lookups
      await queryRunner.query(`
        CREATE INDEX "IDX_ORG_INVITES_EMAIL_LOWER"
        ON "org_invites" (LOWER(email))
      `);
    }

    // 3. Create auth_outbox table
    const authOutboxExists = await queryRunner.hasTable('auth_outbox');
    if (!authOutboxExists) {
      await queryRunner.createTable(
        new Table({
          name: 'auth_outbox',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'gen_random_uuid()',
            },
            {
              name: 'type',
              type: 'varchar',
              length: '100',
              isNullable: false,
            },
            {
              name: 'payload_json',
              type: 'jsonb',
              isNullable: false,
            },
            {
              name: 'status',
              type: 'varchar',
              length: '50',
              default: "'pending'",
              isNullable: false,
            },
            {
              name: 'attempts',
              type: 'integer',
              default: 0,
              isNullable: false,
            },
            {
              name: 'next_attempt_at',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'processed_at',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'claimed_at',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'processing_started_at',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'sent_at',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'error_message',
              type: 'text',
              isNullable: true,
            },
            {
              name: 'last_error',
              type: 'text',
              isNullable: true,
            },
          ],
        }),
        true,
      );

      await queryRunner.createIndex(
        'auth_outbox',
        new TableIndex({
          name: 'IDX_AUTH_OUTBOX_STATUS',
          columnNames: ['status'],
        }),
      );

      await queryRunner.createIndex(
        'auth_outbox',
        new TableIndex({
          name: 'IDX_AUTH_OUTBOX_NEXT_ATTEMPT',
          columnNames: ['next_attempt_at'],
        }),
      );

      await queryRunner.createIndex(
        'auth_outbox',
        new TableIndex({
          name: 'IDX_AUTH_OUTBOX_TYPE',
          columnNames: ['type'],
        }),
      );
    }

    // 4. Ensure users table has email_verified_at column
    const usersTable = await queryRunner.getTable('users');
    const hasEmailVerifiedAt = usersTable?.findColumnByName('email_verified_at');
    if (!hasEmailVerifiedAt) {
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN "email_verified_at" TIMESTAMP NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_AUTH_OUTBOX_TYPE"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_AUTH_OUTBOX_NEXT_ATTEMPT"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_AUTH_OUTBOX_STATUS"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ORG_INVITES_EMAIL_LOWER"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ORG_INVITES_EMAIL"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ORG_INVITES_ORG_ID"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ORG_INVITES_TOKEN_HASH"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_EMAIL_VERIFICATION_EXPIRES_AT"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_EMAIL_VERIFICATION_USER_ID"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_EMAIL_VERIFICATION_TOKEN_HASH"`);

    // Drop tables
    await queryRunner.dropTable('auth_outbox', true);
    await queryRunner.dropTable('org_invites', true);
    await queryRunner.dropTable('email_verification_tokens', true);

    // Note: We don't drop email_verified_at column to preserve data
  }
}

