import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateBillingTables1764000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure uuid-ossp extension exists (required for uuid_generate_v4)
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // Create plans table
    await queryRunner.createTable(
      new Table({
        name: 'plans',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['starter', 'professional', 'enterprise'],
          },
          {
            name: 'price',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'billingCycle',
            type: 'enum',
            enum: ['monthly', 'yearly'],
            default: "'monthly'",
          },
          {
            name: 'features',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'featureList',
            type: 'jsonb',
            default: "'[]'",
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'stripePriceId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'stripeProductId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create subscriptions table
    await queryRunner.createTable(
      new Table({
        name: 'subscriptions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'organizationId',
            type: 'uuid',
          },
          {
            name: 'planId',
            type: 'uuid',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['trial', 'active', 'cancelled', 'past_due', 'unpaid'],
            default: "'trial'",
          },
          {
            name: 'currentPeriodStart',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'currentPeriodEnd',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'trialEndsAt',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'stripeSubscriptionId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'stripeCustomerId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'autoRenew',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'subscriptions',
      new TableForeignKey({
        columnNames: ['organizationId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organizations',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'subscriptions',
      new TableForeignKey({
        columnNames: ['planId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'plans',
        onDelete: 'RESTRICT',
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'subscriptions',
      new TableIndex({
        name: 'IDX_subscriptions_organizationId',
        columnNames: ['organizationId'],
      }),
    );

    await queryRunner.createIndex(
      'subscriptions',
      new TableIndex({
        name: 'IDX_subscriptions_planId',
        columnNames: ['planId'],
      }),
    );

    await queryRunner.createIndex(
      'subscriptions',
      new TableIndex({
        name: 'IDX_subscriptions_status',
        columnNames: ['status'],
      }),
    );

    // Seed default plans
    await queryRunner.query(`
      INSERT INTO plans (id, name, type, price, "billingCycle", features, "featureList", "isActive") VALUES
      (
        uuid_generate_v4(),
        'Starter',
        'starter',
        0.00,
        'monthly',
        '{"maxUsers": 5, "maxProjects": 10, "maxWorkspaces": 3, "storageGB": 5, "aiInsights": false, "advancedAnalytics": false, "customIntegrations": false, "prioritySupport": false, "apiAccess": false, "whiteLabeling": false, "dedicatedSupport": false}',
        '["Up to 5 team members", "Basic project templates", "Email support", "Core PM features", "Basic reporting & dashboards", "Limited AI insights"]',
        true
      ),
      (
        uuid_generate_v4(),
        'Professional',
        'professional',
        17.99,
        'monthly',
        '{"maxUsers": null, "maxProjects": null, "maxWorkspaces": null, "storageGB": 100, "aiInsights": true, "advancedAnalytics": true, "customIntegrations": true, "prioritySupport": true, "apiAccess": true, "whiteLabeling": false, "dedicatedSupport": false}',
        '["Unlimited team members", "Advanced project templates", "Priority support", "Full AI-powered insights & recommendations", "Advanced integrations & APIs", "Custom workflows & automation", "Advanced analytics & reporting dashboards", "Team collaboration tools & real-time updates"]',
        true
      ),
      (
        uuid_generate_v4(),
        'Enterprise',
        'enterprise',
        24.99,
        'monthly',
        '{"maxUsers": null, "maxProjects": null, "maxWorkspaces": null, "storageGB": 1000, "aiInsights": true, "advancedAnalytics": true, "customIntegrations": true, "prioritySupport": true, "apiAccess": true, "whiteLabeling": true, "dedicatedSupport": true}',
        '["Everything in Professional", "Advanced security & RBAC controls", "Custom integrations & white-labeling", "Dedicated support & account management", "Full API access & webhooks", "High availability & monitoring"]',
        true
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('subscriptions', true);
    await queryRunner.dropTable('plans', true);
  }
}
