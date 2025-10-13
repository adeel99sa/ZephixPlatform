import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';

describe('Projects E2E', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;
  let userId: string;
  let organizationId: string;
  let workspaceId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env.test', '.env'],
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    dataSource = moduleFixture.get<DataSource>(DataSource);
    
    // Set global prefix like in main.ts
    app.setGlobalPrefix('api');
    
    // Set up test database
    await app.init();
    
    // Create test user and organization
    await setupTestData();
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData();
    await app.close();
  });

  async function setupTestData() {
    const timestamp = Date.now();
    
    // Create test organization with unique slug
    const orgResult = await dataSource.query(`
      INSERT INTO organizations (id, name, slug, created_at, updated_at)
      VALUES (gen_random_uuid(), 'Test Organization ${timestamp}', 'test-org-${timestamp}', NOW(), NOW())
      RETURNING id
    `);
    organizationId = orgResult[0].id;

    // Create test workspace
    const workspaceResult = await dataSource.query(`
      INSERT INTO workspaces (id, name, organization_id, created_by, created_at, updated_at)
      VALUES (gen_random_uuid(), 'Test Workspace', $1, NULL, NOW(), NOW())
      RETURNING id
    `, [organizationId]);
    workspaceId = workspaceResult[0].id;

    // Create test user with proper password hash and unique email
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('testpassword', 10);
    const testEmail = `test-${timestamp}@example.com`;
    
    const userResult = await dataSource.query(`
      INSERT INTO users (id, email, password, first_name, last_name, organization_id, current_workspace_id, role, is_email_verified, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, 'Test', 'User', $3, $4, 'admin', true, NOW(), NOW())
      RETURNING id
    `, [testEmail, hashedPassword, organizationId, workspaceId]);
    userId = userResult[0].id;

    // Create root folder
    await dataSource.query(`
      INSERT INTO workspace_folders (id, workspace_id, organization_id, created_by, name, parent_folder_id, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, 'Root', NULL, NOW(), NOW())
    `, [workspaceId, organizationId, userId]);

    // Generate test token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'testpassword'
      });

    if (loginResponse.status === 200 || loginResponse.status === 201) {
      // Check different possible response structures
      if (loginResponse.body.data && loginResponse.body.data.accessToken) {
        accessToken = loginResponse.body.data.accessToken;
      } else if (loginResponse.body.accessToken) {
        accessToken = loginResponse.body.accessToken;
      } else {
        console.log('Login response structure:', JSON.stringify(loginResponse.body, null, 2));
        accessToken = 'mock-token-for-testing';
      }
      console.log('Login successful, using real token');
    } else {
      // If login fails, create a mock token for testing
      console.log('Login failed, using mock token. Status:', loginResponse.status);
      console.log('Login response:', loginResponse.body);
      accessToken = 'mock-token-for-testing';
    }
  }

  async function cleanupTestData() {
    if (dataSource) {
      await dataSource.query('DELETE FROM workspace_folders WHERE organization_id = $1', [organizationId]);
      await dataSource.query('DELETE FROM projects WHERE organization_id = $1', [organizationId]);
      await dataSource.query('DELETE FROM users WHERE organization_id = $1', [organizationId]);
      await dataSource.query('DELETE FROM workspaces WHERE organization_id = $1', [organizationId]);
      await dataSource.query('DELETE FROM organizations WHERE id = $1', [organizationId]);
    }
  }

  describe('POST /api/projects', () => {
    it('should create a project without workspaceId/folderId (happy path)', async () => {
      const projectData = {
        name: 'Test Project E2E',
        description: 'Testing project creation',
        startDate: '2025-01-15',
        estimatedEndDate: '2025-06-30'
      };

      const response = await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(projectData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(projectData.name);
      expect(response.body.data.workspaceId).toBe(workspaceId);
      expect(response.body.data.organizationId).toBe(organizationId);
    });

    it('should create a project with explicit workspaceId and folderId', async () => {
      // Get a folder ID first
      const folderResult = await dataSource.query(`
        SELECT id FROM workspace_folders 
        WHERE workspace_id = $1 AND parent_folder_id IS NULL 
        LIMIT 1
      `, [workspaceId]);
      const folderId = folderResult[0]?.id;

      const projectData = {
        name: 'Test Project with IDs',
        description: 'Testing with explicit IDs',
        startDate: '2025-01-15',
        estimatedEndDate: '2025-06-30',
        workspaceId: workspaceId,
        folderId: folderId
      };

      const response = await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(projectData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.workspaceId).toBe(workspaceId);
      expect(response.body.data.folderId).toBe(folderId);
    });

    it('should return 400 when folderId belongs to different workspace', async () => {
      // Create another workspace and folder
      const otherWorkspaceResult = await dataSource.query(`
        INSERT INTO workspaces (id, name, organization_id, created_by, created_at, updated_at)
        VALUES (gen_random_uuid(), 'Other Workspace', $1, NULL, NOW(), NOW())
        RETURNING id
      `, [organizationId]);
      const otherWorkspaceId = otherWorkspaceResult[0].id;

      const otherFolderResult = await dataSource.query(`
        INSERT INTO workspace_folders (id, workspace_id, organization_id, created_by, name, parent_folder_id, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, 'Other Root', NULL, NOW(), NOW())
        RETURNING id
      `, [otherWorkspaceId, organizationId, userId]);
      const otherFolderId = otherFolderResult[0].id;

      const projectData = {
        name: 'Test Project Wrong Folder',
        description: 'Testing with wrong folder',
        startDate: '2025-01-15',
        estimatedEndDate: '2025-06-30',
        workspaceId: workspaceId,
        folderId: otherFolderId // This folder belongs to different workspace
      };

      await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(projectData)
        .expect(400);

      // Clean up
      await dataSource.query('DELETE FROM workspace_folders WHERE id = $1', [otherFolderId]);
      await dataSource.query('DELETE FROM workspaces WHERE id = $1', [otherWorkspaceId]);
    });

    it('should return 400 when workspaceId is missing and user has no currentWorkspaceId', async () => {
      // Update user to have no current workspace
      await dataSource.query(`
        UPDATE users SET current_workspace_id = NULL WHERE id = $1
      `, [userId]);

      const projectData = {
        name: 'Test Project No Workspace',
        description: 'Testing without workspace',
        startDate: '2025-01-15',
        estimatedEndDate: '2025-06-30'
      };

      await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(projectData)
        .expect(400);

      // Restore user's workspace
      await dataSource.query(`
        UPDATE users SET current_workspace_id = $1 WHERE id = $2
      `, [workspaceId, userId]);
    });
  });

  describe('GET /api/projects', () => {
    it('should list projects for the user', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
