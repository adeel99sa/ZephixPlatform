import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { WorkPhase } from '../src/modules/work-management/entities/work-phase.entity';
import { Project, ProjectState } from '../src/modules/projects/entities/project.entity';
import { AuditEvent } from '../src/modules/work-management/entities/audit-event.entity';
import { User } from '../src/modules/users/entities/user.entity';
import { Organization } from '../src/organizations/entities/organization.entity';
import { Workspace } from '../src/modules/workspaces/entities/workspace.entity';
import { UserOrganization } from '../src/organizations/entities/user-organization.entity';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { ApiErrorFilter } from '../src/shared/filters/api-error.filter';

describe('Work Management Ack Flow (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let org1: Organization;
  let adminUser1: User;
  let workspace1: Workspace;
  let project1: Project;
  let adminToken1: string;
  let milestonePhaseId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new ApiErrorFilter());
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    // Create test organization
    const orgRepo = dataSource.getRepository(Organization);
    org1 = await orgRepo.save({
      name: 'Ack Test Org',
      slug: 'ack-test-org-' + Date.now(),
      domain: 'acktest.com',
    });

    // Create test user
    const userRepo = dataSource.getRepository(User);
    const hashedPassword = await bcrypt.hash('password123', 10);
    adminUser1 = await userRepo.save({
      email: `ack-test-${Date.now()}@example.com`,
      firstName: 'Ack',
      lastName: 'Test',
      password: hashedPassword,
      emailVerifiedAt: new Date(),
    });

    // Create user-organization link
    const uoRepo = dataSource.getRepository(UserOrganization);
    await uoRepo.save({
      userId: adminUser1.id,
      organizationId: org1.id,
      role: 'admin',
    });

    // Login to get token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: adminUser1.email,
        password: 'password123',
      });

    adminToken1 = loginResponse.body.accessToken || loginResponse.body.data?.accessToken;

    // Create workspace
    const workspaceRepo = dataSource.getRepository(Workspace);
    workspace1 = await workspaceRepo.save({
      name: 'Ack Test Workspace',
      organizationId: org1.id,
      createdBy: adminUser1.id,
      isPrivate: false,
    });

    // Create project
    const projectRepo = dataSource.getRepository(Project);
    project1 = await projectRepo.save({
      name: 'Ack Test Project',
      organizationId: org1.id,
      workspaceId: workspace1.id,
      state: ProjectState.DRAFT,
      structureLocked: false,
    });

    // Create milestone phase with dueDate
    const phaseRepo = dataSource.getRepository(WorkPhase);
    const milestonePhase = phaseRepo.create({
      organizationId: org1.id,
      workspaceId: workspace1.id,
      projectId: project1.id,
      name: 'Milestone Phase',
      sortOrder: 0,
      reportingKey: 'M1',
      isMilestone: true,
      dueDate: new Date('2024-12-31'),
      createdByUserId: adminUser1.id,
    });
    await phaseRepo.save(milestonePhase);
    milestonePhaseId = milestonePhase.id;

    // Start project
    await request(app.getHttpServer())
      .post(`/api/work/projects/${project1.id}/start`)
      .set('Authorization', `Bearer ${adminToken1}`)
      .set('x-workspace-id', workspace1.id);
  });

  afterAll(async () => {
    // Cleanup
    if (dataSource) {
      const phaseRepo = dataSource.getRepository(WorkPhase);
      await phaseRepo.delete({ projectId: project1.id });
      const auditRepo = dataSource.getRepository(AuditEvent);
      await auditRepo.delete({ projectId: project1.id });
      const projectRepo = dataSource.getRepository(Project);
      await projectRepo.delete({ id: project1.id });
      const workspaceRepo = dataSource.getRepository(Workspace);
      await workspaceRepo.delete({ id: workspace1.id });
      const uoRepo = dataSource.getRepository(UserOrganization);
      await uoRepo.delete({ organizationId: org1.id });
      const userRepo = dataSource.getRepository(User);
      await userRepo.delete({ id: adminUser1.id });
      const orgRepo = dataSource.getRepository(Organization);
      await orgRepo.delete({ id: org1.id });
    }
    await app.close();
  });

  describe('Test 1: Ack required on milestone rename', () => {
    it('should return 409 ACK_REQUIRED when renaming milestone phase without token', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/work/phases/${milestonePhaseId}`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-workspace-id', workspace1.id)
        .send({
          name: 'Renamed Milestone Phase',
        });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('ACK_REQUIRED');
      expect(response.body.message).toBe('Confirmation required');
      expect(response.body.ack).toBeDefined();
      expect(response.body.ack.token).toBeDefined();
      expect(response.body.ack.expiresAt).toBeDefined();
      expect(response.body.ack.impactSummary).toBeDefined();
      expect(response.body.ack.impactedEntities).toBeDefined();
      expect(response.body.ack.impactedEntities.length).toBeGreaterThan(0);
    });
  });

  describe('Test 2: Confirm with token', () => {
    let ackToken: string;

    it('should return 200 and update phase when token is provided', async () => {
      // First request to get ack token
      const ackResponse = await request(app.getHttpServer())
        .patch(`/api/work/phases/${milestonePhaseId}`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-workspace-id', workspace1.id)
        .send({
          name: 'Renamed Milestone Phase',
        });

      expect(ackResponse.status).toBe(409);
      expect(ackResponse.body.code).toBe('ACK_REQUIRED');
      ackToken = ackResponse.body.ack.token;

      // Resubmit with token
      const updateResponse = await request(app.getHttpServer())
        .patch(`/api/work/phases/${milestonePhaseId}`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-workspace-id', workspace1.id)
        .set('x-ack-token', ackToken)
        .send({
          name: 'Renamed Milestone Phase',
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.name).toBe('Renamed Milestone Phase');

      // Verify audit event was written
      const auditRepo = dataSource.getRepository(AuditEvent);
      const auditEvents = await auditRepo.find({
        where: {
          projectId: project1.id,
          eventType: 'ACK_CONSUMED',
        },
      });

      expect(auditEvents.length).toBeGreaterThan(0);
      const ackConsumedEvent = auditEvents.find((e) => e.eventType === 'ACK_CONSUMED');
      expect(ackConsumedEvent).toBeDefined();
      expect(ackConsumedEvent?.entityId).toBe(milestonePhaseId);

      const phaseUpdatedEvent = await auditRepo.findOne({
        where: {
          projectId: project1.id,
          eventType: 'PHASE_UPDATED_WITH_ACK',
        },
      });
      expect(phaseUpdatedEvent).toBeDefined();
      expect(phaseUpdatedEvent?.entityId).toBe(milestonePhaseId);
    });
  });

  describe('Test 3: Token single use', () => {
    it('should return 409 ACK_TOKEN_INVALID when reusing token', async () => {
      // Get ack token
      const ackResponse = await request(app.getHttpServer())
        .patch(`/api/work/phases/${milestonePhaseId}`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-workspace-id', workspace1.id)
        .send({
          name: 'Another Rename',
        });

      expect(ackResponse.status).toBe(409);
      const ackToken = ackResponse.body.ack.token;

      // Use token once
      await request(app.getHttpServer())
        .patch(`/api/work/phases/${milestonePhaseId}`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-workspace-id', workspace1.id)
        .set('x-ack-token', ackToken)
        .send({
          name: 'Another Rename',
        });

      // Try to reuse token
      const reuseResponse = await request(app.getHttpServer())
        .patch(`/api/work/phases/${milestonePhaseId}`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-workspace-id', workspace1.id)
        .set('x-ack-token', ackToken)
        .send({
          name: 'Another Rename',
        });

      expect(reuseResponse.status).toBe(409);
      expect(reuseResponse.body.code).toBe('ACK_TOKEN_INVALID');
      expect(reuseResponse.body.message).toBe('Confirmation expired. Try again.');
    });
  });

  describe('Test 4: Expired token', () => {
    it('should return 409 ACK_TOKEN_EXPIRED for expired token', async () => {
      // This test requires manipulating token expiry
      // For now, we'll test by waiting or manipulating the token directly
      // In a real scenario, you might set a very short expiry or manipulate the DB

      // Get ack token
      const ackResponse = await request(app.getHttpServer())
        .patch(`/api/work/phases/${milestonePhaseId}`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-workspace-id', workspace1.id)
        .send({
          dueDate: '2025-01-01',
        });

      expect(ackResponse.status).toBe(409);
      const ackToken = ackResponse.body.ack.token;

      // Manually expire the token in DB
      await dataSource.query(
        `UPDATE ack_tokens SET expires_at = NOW() - INTERVAL '1 minute' WHERE token_hash = (
          SELECT token_hash FROM ack_tokens ORDER BY created_at DESC LIMIT 1
        )`,
      );

      // Try to use expired token
      const expiredResponse = await request(app.getHttpServer())
        .patch(`/api/work/phases/${milestonePhaseId}`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-workspace-id', workspace1.id)
        .set('x-ack-token', ackToken)
        .send({
          dueDate: '2025-01-01',
        });

      expect(expiredResponse.status).toBe(409);
      expect(expiredResponse.body.code).toBe('ACK_TOKEN_EXPIRED');
      expect(expiredResponse.body.message).toBe('Confirmation expired. Try again.');
    });
  });

  describe('Test 5: Disallowed edits even with token', () => {
    it('should return 409 REPORTING_IMPACT_NOT_ALLOWED for sortOrder change', async () => {
      // Try to change sortOrder (disallowed) - no token needed, should fail immediately
      const disallowedResponse = await request(app.getHttpServer())
        .patch(`/api/work/phases/${milestonePhaseId}`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-workspace-id', workspace1.id)
        .send({
          sortOrder: 999,
        });

      expect(disallowedResponse.status).toBe(409);
      expect(disallowedResponse.body.code).toBe('REPORTING_IMPACT_NOT_ALLOWED');
      expect(disallowedResponse.body.message).toBe('Change not allowed after start.');
    });
  });
});

