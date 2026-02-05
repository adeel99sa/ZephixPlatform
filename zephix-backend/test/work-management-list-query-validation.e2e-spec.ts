import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { Organization } from '../src/organizations/entities/organization.entity';
import { User } from '../src/modules/users/entities/user.entity';
import { Workspace } from '../src/modules/workspaces/entities/workspace.entity';
import { UserOrganization } from '../src/organizations/entities/user-organization.entity';
import { WorkspaceMember } from '../src/modules/workspaces/entities/workspace-member.entity';
import * as bcrypt from 'bcrypt';
import { ApiErrorFilter } from '../src/shared/filters/api-error.filter';

/**
 * listTasks query parsing and validation: invalid params return 400.
 * Proves DTO and service validation; no raw strings in orderBy.
 */
describe('List work tasks query validation (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;
  let workspaceId: string;

  beforeAll(async () => {
    process.env.DEMO_BOOTSTRAP = 'false';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new ApiErrorFilter());
    dataSource = moduleFixture.get<DataSource>(DataSource);
    await app.init();

    const orgRepo = dataSource.getRepository(Organization);
    const org = await orgRepo.save({
      name: 'List Validation Org',
      slug: 'list-validation-' + Date.now(),
      domain: 'listvalidation.com',
    });

    const hashedPassword = await bcrypt.hash('password123', 10);
    const userRepo = dataSource.getRepository(User);
    const user = await userRepo.save({
      email: `list-validation-${Date.now()}@example.com`,
      firstName: 'List',
      lastName: 'User',
      password: hashedPassword,
      emailVerifiedAt: new Date(),
      organizationId: org.id,
    });

    const uoRepo = dataSource.getRepository(UserOrganization);
    await uoRepo.save({ userId: user.id, organizationId: org.id, role: 'pm' });

    const workspaceRepo = dataSource.getRepository(Workspace);
    const workspace = await workspaceRepo.save({
      name: 'List Validation Workspace',
      organizationId: org.id,
      createdBy: user.id,
      isPrivate: false,
    });
    workspaceId = workspace.id;

    const memberRepo = dataSource.getRepository(WorkspaceMember);
    await memberRepo.save({
      workspaceId,
      userId: user.id,
      role: 'workspace_owner',
    });

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: user.email, password: 'password123' });
    if (loginRes.status !== 200 && loginRes.status !== 201) {
      throw new Error(`Login failed: ${JSON.stringify(loginRes.body)}`);
    }
    authToken = loginRes.body.data?.accessToken || loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  const get = (query: string) =>
    request(app.getHttpServer())
      .get(`/api/work/tasks?${query}`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-workspace-id', workspaceId);

  describe('dueFrom / dueTo', () => {
    it('dueFrom invalid string returns 400', async () => {
      const res = await get('dueFrom=not-a-date');
      expect(res.status).toBe(400);
    });

    it('dueTo invalid string returns 400', async () => {
      const res = await get('dueTo=invalid');
      expect(res.status).toBe(400);
    });

    it('dueFrom after dueTo returns 400', async () => {
      const res = await get('dueFrom=2025-02-10&dueTo=2025-02-01');
      expect(res.status).toBe(400);
      expect(res.body?.code === 'VALIDATION_ERROR' || res.body?.message).toBeTruthy();
    });
  });

  describe('includeStatuses / excludeStatuses', () => {
    it('includeStatuses contains invalid value returns 400', async () => {
      const res = await get('includeStatuses=INVALID_STATUS');
      expect(res.status).toBe(400);
      expect(res.body?.code === 'VALIDATION_ERROR' || res.body?.message).toBeTruthy();
    });

    it('excludeStatuses contains invalid value returns 400', async () => {
      const res = await get('excludeStatuses=UNKNOWN');
      expect(res.status).toBe(400);
      expect(res.body?.code === 'VALIDATION_ERROR' || res.body?.message).toBeTruthy();
    });

    it('includeStatuses and excludeStatuses overlap returns 400', async () => {
      const res = await get('includeStatuses=TODO&excludeStatuses=TODO');
      expect(res.status).toBe(400);
      expect(res.body?.code === 'VALIDATION_ERROR' || res.body?.message).toBeTruthy();
    });
  });

  describe('sortBy / sortDir', () => {
    it('sortBy invalid returns 400', async () => {
      const res = await get('sortBy=invalidField');
      expect(res.status).toBe(400);
    });

    it('sortDir invalid returns 400', async () => {
      const res = await get('sortDir=invalidDir');
      expect(res.status).toBe(400);
    });
  });
});
