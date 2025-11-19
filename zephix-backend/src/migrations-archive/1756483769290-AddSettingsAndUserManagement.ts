import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSettingsAndUserManagement1756500000001
  implements MigrationInterface
{
  name = 'AddSettingsAndUserManagement1756500000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // User Settings Table
    await queryRunner.query(`
            CREATE TABLE "user_settings" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "organizationId" uuid NOT NULL,
                "preferences" jsonb DEFAULT '{}',
                "emailNotifications" boolean DEFAULT true,
                "pushNotifications" boolean DEFAULT true,
                "theme" varchar(20) DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
                "timezone" varchar(50) DEFAULT 'UTC',
                "language" varchar(10) DEFAULT 'en',
                "dateFormat" varchar(20) DEFAULT 'MM/dd/yyyy',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_user_settings" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_user_settings_user_org" UNIQUE ("userId", "organizationId")
            )
        `);

    // Organization Settings Table
    await queryRunner.query(`
            CREATE TABLE "organization_settings" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "organizationId" uuid NOT NULL,
                "name" varchar(255) NOT NULL,
                "domain" varchar(255),
                "timezone" varchar(50) DEFAULT 'UTC',
                "language" varchar(10) DEFAULT 'en',
                "dateFormat" varchar(20) DEFAULT 'MM/dd/yyyy',
                "currency" varchar(10) DEFAULT 'USD',
                "branding" jsonb DEFAULT '{}',
                "businessHours" jsonb DEFAULT '{"start": "09:00", "end": "17:00", "days": [1,2,3,4,5]}',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_organization_settings" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_organization_settings_org" UNIQUE ("organizationId")
            )
        `);

    // Security Settings Table
    await queryRunner.query(`
            CREATE TABLE "security_settings" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "organizationId" uuid NOT NULL,
                "twoFactorEnabled" boolean DEFAULT false,
                "sessionTimeout" integer DEFAULT 480,
                "passwordPolicy" jsonb DEFAULT '{"minLength": 8, "requireNumbers": true, "requireSymbols": true, "requireUppercase": true}',
                "ipWhitelist" text[],
                "maxFailedAttempts" integer DEFAULT 5,
                "lockoutDuration" integer DEFAULT 30,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_security_settings" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_security_settings_org" UNIQUE ("organizationId")
            )
        `);

    // Add foreign key constraints
    await queryRunner.query(`
            ALTER TABLE "user_settings" ADD CONSTRAINT "FK_user_settings_user" 
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            ALTER TABLE "user_settings" ADD CONSTRAINT "FK_user_settings_organization" 
            FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            ALTER TABLE "organization_settings" ADD CONSTRAINT "FK_organization_settings_organization" 
            FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            ALTER TABLE "security_settings" ADD CONSTRAINT "FK_security_settings_organization" 
            FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

    // Create indexes for performance
    await queryRunner.query(
      `CREATE INDEX "IDX_user_settings_user_org" ON "user_settings" ("userId", "organizationId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_organization_settings_org" ON "organization_settings" ("organizationId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_security_settings_org" ON "security_settings" ("organizationId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "security_settings"`);
    await queryRunner.query(`DROP TABLE "organization_settings"`);
    await queryRunner.query(`DROP TABLE "user_settings"`);
  }
}
