import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAnalyticsEventsTable1735920000000 implements MigrationInterface {
  name = 'CreateAnalyticsEventsTable1735920000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE analytics_events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        event_name VARCHAR(255) NOT NULL,
        user_id UUID,
        organization_id UUID NOT NULL,
        properties JSONB,
        timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX idx_analytics_org_event ON analytics_events(organization_id, event_name)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_analytics_timestamp ON analytics_events(timestamp)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE analytics_events`);
  }
}
