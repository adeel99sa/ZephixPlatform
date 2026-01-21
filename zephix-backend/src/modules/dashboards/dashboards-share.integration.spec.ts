/**
 * Dashboards Share Read Integration Tests
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: path.resolve(__dirname, '../../../.env.test') });
}
if (
  !process.env.DATABASE_URL ||
  process.env.DATABASE_URL.toLowerCase().includes('production')
) {
  throw new Error(
    '❌ ERROR: DATABASE_URL appears to be production. Use test database only.',
  );
}
if (process.env.NODE_ENV !== 'test') {
  throw new Error(`❌ ERROR: NODE_ENV must be 'test', got: ${process.env.NODE_ENV}`);
}

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { DataSource } from 'typeorm';

jest.setTimeout(60000);

describe('Dashboards Share Read (e2e)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let dataSource: DataSource;

  let orgId: string;
  let ownerUserId: string;
  let dashboardId: string;
  let shareToken: string;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
    await setupTestData();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    await dataSource.query(
      `UPDATE dashboards
       SET share_enabled = true, share_expires_at = NULL, deleted_at = NULL, share_token = $1
       WHERE id = $2`,
      [shareToken, dashboardId],
    );
  });

  it('returns sanitized shared dashboard payload', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/dashboards/${dashboardId}`)
      .query({ share: shareToken })
      .expect(200);

    expect(response.body).toHaveProperty('data');
    const data = response.body.data;

    // Assert only allowed top-level fields exist
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('name');
    expect(data.id).toBe(dashboardId);
    expect(data.name).toBe('Shared Dashboard');

    // Assert internal fields are absent
    expect(data).not.toHaveProperty('organizationId');
    expect(data).not.toHaveProperty('ownerUserId');
    expect(data).not.toHaveProperty('deletedAt');
    expect(data).not.toHaveProperty('shareToken');
    expect(data).not.toHaveProperty('shareEnabled');
    expect(data).not.toHaveProperty('shareExpiresAt');

    // Assert widgets structure
    expect(Array.isArray(data.widgets)).toBe(true);
    expect(data.widgets.length).toBeGreaterThan(0);

    const widget = data.widgets[0];
    expect(widget).toHaveProperty('id');
    expect(widget).toHaveProperty('type');
    expect(widget).toHaveProperty('title');
    expect(widget).toHaveProperty('layout');
    expect(widget).toHaveProperty('config');

    // project_health has empty allowlist, so config must be {}
    expect(widget.type).toBe('project_health');
    expect(widget.config).toEqual({});
  });

  it('returns 404 for invalid token (case mismatch)', async () => {
    // Invalid token should return 404 (not found), not 400
    await request(app.getHttpServer())
      .get(`/api/dashboards/${dashboardId}`)
      .query({ share: shareToken.toUpperCase() })
      .expect(404);
  });

  it('returns 404 for invalid token (whitespace)', async () => {
    // Invalid token should return 404 (not found), not 400
    await request(app.getHttpServer())
      .get(`/api/dashboards/${dashboardId}`)
      .query({ share: `${shareToken} ` })
      .expect(404);
  });

  it('returns 404 when sharing is disabled', async () => {
    await dataSource.query(
      `UPDATE dashboards SET share_enabled = false WHERE id = $1`,
      [dashboardId],
    );

    await request(app.getHttpServer())
      .get(`/api/dashboards/${dashboardId}`)
      .query({ share: shareToken })
      .expect(404);
  });

  it('returns 404 when share is expired', async () => {
    const expiredAt = '2000-01-01 00:00:00';
    await dataSource.query(
      `UPDATE dashboards SET share_expires_at = $1 WHERE id = $2`,
      [expiredAt, dashboardId],
    );

    await request(app.getHttpServer())
      .get(`/api/dashboards/${dashboardId}`)
      .query({ share: shareToken })
      .expect(404);
  });

  it('returns 404 when dashboard is deleted', async () => {
    await dataSource.query(
      `UPDATE dashboards SET deleted_at = NOW() WHERE id = $1`,
      [dashboardId],
    );

    await request(app.getHttpServer())
      .get(`/api/dashboards/${dashboardId}`)
      .query({ share: shareToken })
      .expect(404);
  });

  async function setupTestData() {
    const run = Date.now();
    const adminEmail = `dash-share-owner+${run}@test.com`;
    const orgResult = await dataSource.query(
      `INSERT INTO organizations (id, name, slug, created_at, updated_at)
       VALUES (
         gen_random_uuid(),
         'Dashboards Share Org ' || gen_random_uuid()::text,
         'dash-share-' || substring(gen_random_uuid()::text, 1, 8),
         NOW(),
         NOW()
       )
       RETURNING id`,
    );
    orgId = orgResult[0].id;

    const dummyPasswordHash = '$2b$10$dummy.hash.for.test.users.only';
    const userResult = await dataSource.query(
      `INSERT INTO users (id, email, password, first_name, last_name, organization_id, role, created_at, updated_at)
       VALUES (gen_random_uuid(), $2, $1, 'Dash', 'Owner', $3, 'admin', NOW(), NOW())
       RETURNING id`,
      [dummyPasswordHash, adminEmail, orgId],
    );
    ownerUserId = userResult[0].id;

    const dashboardResult = await dataSource.query(
      `INSERT INTO dashboards (
        id, organization_id, workspace_id, name, description, owner_user_id,
        visibility, is_template_instance, template_key, share_token, share_enabled,
        share_expires_at, created_at, updated_at, deleted_at
      )
      VALUES (
        gen_random_uuid(), $1, NULL, 'Shared Dashboard', 'Public view', $2,
        'ORG', false, NULL, gen_random_uuid(), true, NULL, NOW(), NOW(), NULL
      )
      RETURNING id, share_token`,
      [orgId, ownerUserId],
    );
    dashboardId = dashboardResult[0].id;
    shareToken = dashboardResult[0].share_token;

    // Create widget config with:
    // - One allowlisted key (if project_health had any - but it has empty allowlist)
    // - One non-allowlisted key (query)
    // - One nested object (nested)
    // - One array (items)
    // All should be filtered out since project_health has empty allowlist
    const widgetConfig = JSON.stringify({
      query: 'SELECT * FROM users', // Non-allowlisted, unsafe SQL-like
      template: '${secret}', // Non-allowlisted, unsafe template expression
      nested: { key: 'value' }, // Nested object - should be rejected
      items: ['item1', 'item2'], // Array - should be rejected
    });

    await dataSource.query(
      `INSERT INTO dashboard_widgets (
        id, organization_id, dashboard_id, widget_key, title, config, layout, created_at, updated_at
      )
      VALUES (
        gen_random_uuid(), $1, $2, 'project_health', 'Project Health',
        $3,
        '{"x":0,"y":0,"w":4,"h":3}',
        NOW(), NOW()
      )`,
      [orgId, dashboardId, widgetConfig],
    );
  }
});
