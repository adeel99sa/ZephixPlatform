import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/users/entities/user.entity';
import { Organization } from '../src/organizations/entities/organization.entity';
import { Workspace } from '../src/modules/workspaces/entities/workspace.entity';
import { WorkspaceMember } from '../src/modules/workspaces/entities/workspace-member.entity';
import {
  Project,
  ProjectStatus,
  ProjectPriority,
  ProjectRiskLevel,
} from '../src/modules/projects/entities/project.entity';
import { WorkTask } from '../src/modules/work-management/entities/work-task.entity';
import { UserOrganization } from '../src/organizations/entities/user-organization.entity';
import * as bcrypt from 'bcrypt';

/**
 * MP-2 — GET /work/my-tasks (cross-workspace My Work feed) + workspace-scoped
 * /users/available. Integration test against a real Postgres (DATABASE_URL),
 * mirroring workspace-membership-filtering.e2e-spec.ts.
 *
 * Coverage:
 *  - cross-workspace aggregation: member assigned in 2 workspaces sees both;
 *    a third workspace they are NOT a member of is excluded (flag ON).
 *  - viewer → 403.
 *  - aggregates math (overdue / today / this-week / total) with DB CURRENT_DATE
 *    boundaries; closed (DONE) tasks excluded from open-work counts.
 *  - /users/available?workspaceId scoping + org-wide backward compat.
 */
describe('My Work feed & assignee autocomplete (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let org1: Organization;
  let adminUser: User;
  let memberUser: User;
  let viewerUser: User;
  let otherUser: User; // ws1 member only, for autocomplete scoping
  let ws1: Workspace;
  let ws2: Workspace;
  let ws3: Workspace; // member is NOT a member of ws3
  let project1: Project;
  let project2: Project;
  let project3: Project;
  let memberToken: string;
  let viewerToken: string;

  // Date boundaries derived from the DB's CURRENT_DATE so the test aligns with
  // the aggregates SQL (which also uses CURRENT_DATE).
  let today: string;
  let overdue: string;
  let inThreeDays: string;
  let inTwentyDays: string;

  beforeAll(async () => {
    process.env.DEMO_BOOTSTRAP = 'false';
    process.env.ZEPHIX_WS_MEMBERSHIP_V1 = '1';

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
    app.setGlobalPrefix('api');
    await app.init();

    dataSource = app.get(DataSource);
    if (dataSource && dataSource.isInitialized) {
      await cleanupTestData();
    }

    const [{ current_date }] = await dataSource.query(
      'SELECT CURRENT_DATE::text AS current_date',
    );
    today = current_date;
    overdue = addDays(today, -3);
    inThreeDays = addDays(today, 3);
    inTwentyDays = addDays(today, 20);

    const timestamp = Date.now();
    org1 = await createTestOrganization(`MyTasks Org ${timestamp}`);

    const suffix = `-${timestamp}@test.com`;
    adminUser = await createTestUser(
      `admin${suffix}`,
      'Admin',
      org1.id,
      'admin',
    );
    memberUser = await createTestUser(
      `member${suffix}`,
      'Member',
      org1.id,
      'member',
    );
    viewerUser = await createTestUser(
      `viewer${suffix}`,
      'Viewer',
      org1.id,
      'viewer',
    );
    otherUser = await createTestUser(
      `other${suffix}`,
      'Other',
      org1.id,
      'member',
    );

    await createUserOrganization(adminUser.id, org1.id, 'admin');
    await createUserOrganization(memberUser.id, org1.id, 'member');
    await createUserOrganization(viewerUser.id, org1.id, 'viewer');
    await createUserOrganization(otherUser.id, org1.id, 'member');

    ws1 = await createTestWorkspace('MT Workspace 1', org1.id, adminUser.id);
    ws2 = await createTestWorkspace('MT Workspace 2', org1.id, adminUser.id);
    ws3 = await createTestWorkspace('MT Workspace 3', org1.id, adminUser.id);

    // memberUser: member of ws1 + ws2 (NOT ws3). viewerUser: viewer of ws1.
    // otherUser: member of ws1 only (autocomplete scoping).
    await createWorkspaceMember(
      ws1.id,
      org1.id,
      memberUser.id,
      'workspace_member',
    );
    await createWorkspaceMember(
      ws2.id,
      org1.id,
      memberUser.id,
      'workspace_member',
    );
    await createWorkspaceMember(
      ws1.id,
      org1.id,
      viewerUser.id,
      'workspace_viewer',
    );
    await createWorkspaceMember(
      ws1.id,
      org1.id,
      otherUser.id,
      'workspace_member',
    );

    project1 = await createTestProject('MT Project 1', org1.id, ws1.id);
    project2 = await createTestProject('MT Project 2', org1.id, ws2.id);
    project3 = await createTestProject('MT Project 3', org1.id, ws3.id);

    // ws1 (accessible): overdue, today, this-week — all open.
    await createTask(
      'WS1 overdue',
      org1.id,
      ws1.id,
      project1.id,
      memberUser.id,
      'TODO',
      overdue,
    );
    await createTask(
      'WS1 today',
      org1.id,
      ws1.id,
      project1.id,
      memberUser.id,
      'IN_PROGRESS',
      today,
    );
    await createTask(
      'WS1 week',
      org1.id,
      ws1.id,
      project1.id,
      memberUser.id,
      'TODO',
      inThreeDays,
    );
    // ws2 (accessible): next-month (open), no-due (open), and a DONE-overdue
    // (closed → excluded from open aggregates, but present in unfiltered list).
    await createTask(
      'WS2 nextmonth',
      org1.id,
      ws2.id,
      project2.id,
      memberUser.id,
      'TODO',
      inTwentyDays,
    );
    await createTask(
      'WS2 nodue',
      org1.id,
      ws2.id,
      project2.id,
      memberUser.id,
      'TODO',
      null,
    );
    await createTask(
      'WS2 done-overdue',
      org1.id,
      ws2.id,
      project2.id,
      memberUser.id,
      'DONE',
      addDays(today, -5),
    );
    // ws3 (NOT accessible): due today, assigned to member — must be excluded.
    await createTask(
      'WS3 today excluded',
      org1.id,
      ws3.id,
      project3.id,
      memberUser.id,
      'TODO',
      today,
    );

    memberToken = await getAuthToken(memberUser.email);
    viewerToken = await getAuthToken(viewerUser.email);
  });

  afterAll(async () => {
    await cleanupTestData();
    process.env.ZEPHIX_WS_MEMBERSHIP_V1 = undefined;
    await app.close();
  });

  describe('GET /work/my-tasks', () => {
    it('returns tasks across the member’s workspaces and excludes non-member workspaces', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/work/my-tasks')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      const items = res.body.data.items as any[];
      const titles = items.map((i) => i.title);

      // ws1 + ws2 tasks present (6 incl. the DONE one — list is unfiltered by bucket)
      expect(titles).toContain('WS1 overdue');
      expect(titles).toContain('WS1 today');
      expect(titles).toContain('WS1 week');
      expect(titles).toContain('WS2 nextmonth');
      expect(titles).toContain('WS2 nodue');
      expect(titles).toContain('WS2 done-overdue');
      // ws3 excluded — member is not a member of ws3
      expect(titles).not.toContain('WS3 today excluded');
      expect(res.body.data.total).toBe(6);

      // Rows carry cross-workspace context (project + workspace names).
      const ws1Row = items.find((i) => i.title === 'WS1 overdue');
      expect(ws1Row.workspaceId).toBe(ws1.id);
      expect(ws1Row.workspaceName).toBe('MT Workspace 1');
      expect(ws1Row.projectId).toBe(project1.id);
      expect(ws1Row.projectName).toBe('MT Project 1');

      const workspaceIds = new Set(items.map((i) => i.workspaceId));
      expect(workspaceIds.has(ws1.id)).toBe(true);
      expect(workspaceIds.has(ws2.id)).toBe(true);
      expect(workspaceIds.has(ws3.id)).toBe(false);
    });

    it('computes aggregates over open assigned work using CURRENT_DATE boundaries', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/work/my-tasks')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      const agg = res.body.data.aggregates;
      expect(agg.overdueCount).toBe(1); // WS1 overdue; DONE-overdue excluded (closed)
      expect(agg.dueTodayCount).toBe(1); // WS1 today; WS3 today excluded (not accessible)
      expect(agg.dueThisWeekCount).toBe(1); // WS1 week (+3d); nextmonth (+20d) not in week
      expect(agg.totalAssigned).toBe(5); // 5 open across ws1+ws2 (DONE excluded)
    });

    it('aggregates stay stable when the list is filtered by bucket', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/work/my-tasks?bucket=done')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      // List narrows to the single DONE task…
      const items = res.body.data.items as any[];
      expect(items.map((i) => i.title)).toEqual(['WS2 done-overdue']);
      // …but the badge counts still describe open work (unchanged).
      expect(res.body.data.aggregates.totalAssigned).toBe(5);
      expect(res.body.data.aggregates.overdueCount).toBe(1);
    });

    it('defaults to dueDate ascending with undated work last', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/work/my-tasks')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      const items = res.body.data.items as any[];
      const firstDue = items[0].dueDate;
      const lastDue = items[items.length - 1].dueDate;
      // Earliest date first (the DONE-overdue at -5d or WS1 overdue at -3d)…
      expect(firstDue).not.toBeNull();
      // …and the no-due task sinks to the bottom (NULLS LAST).
      expect(lastDue).toBeNull();
    });

    it('rejects a viewer with 403', async () => {
      await request(app.getHttpServer())
        .get('/api/work/my-tasks')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(403);
    });
  });

  describe('GET /users/available (assignee autocomplete)', () => {
    it('scopes to workspace members when workspaceId is supplied', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/users/available?workspaceId=${ws1.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      const ids = (res.body as any[]).map((u) => u.id);
      // ws1 members: memberUser, viewerUser, otherUser — NOT admin (no member row).
      expect(ids).toContain(memberUser.id);
      expect(ids).toContain(viewerUser.id);
      expect(ids).toContain(otherUser.id);
      expect(ids).not.toContain(adminUser.id);
    });

    it('returns a narrower set for a workspace with fewer members', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/users/available?workspaceId=${ws2.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      const ids = (res.body as any[]).map((u) => u.id);
      expect(ids).toContain(memberUser.id);
      expect(ids).not.toContain(otherUser.id); // otherUser is ws1-only
      expect(ids).not.toContain(viewerUser.id);
    });

    it('preserves org-wide behavior when workspaceId is omitted (backward compat)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/users/available')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      const ids = (res.body as any[]).map((u) => u.id);
      // Whole org, including the admin who is in no workspace member row.
      expect(ids).toContain(adminUser.id);
      expect(ids).toContain(memberUser.id);
      expect(ids).toContain(viewerUser.id);
      expect(ids).toContain(otherUser.id);
    });

    it('rejects a non-UUID workspaceId with 400', async () => {
      await request(app.getHttpServer())
        .get('/api/users/available?workspaceId=not-a-uuid')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(400);
    });
  });

  // ── helpers ──────────────────────────────────────────────────────────
  function addDays(dateStr: string, n: number): string {
    const d = new Date(`${dateStr}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }

  async function cleanupTestData() {
    if (!dataSource || !dataSource.isInitialized) return;
    const safeDelete = async (entity: any) => {
      try {
        await dataSource.getRepository(entity).delete({});
      } catch {
        /* table may not exist */
      }
    };
    await safeDelete(WorkTask);
    await safeDelete(Project);
    await safeDelete(WorkspaceMember);
    await safeDelete(Workspace);
    await safeDelete(UserOrganization);
    await safeDelete(User);
    await safeDelete(Organization);
  }

  async function createTestOrganization(name: string): Promise<Organization> {
    const repo = dataSource.getRepository(Organization);
    return repo.save(
      repo.create({
        name,
        slug: `${name.toLowerCase().replace(/\s+/g, '-')}`,
      }),
    );
  }

  async function createUserOrganization(
    userId: string,
    organizationId: string,
    role: 'owner' | 'admin' | 'member' | 'viewer',
  ) {
    const repo = dataSource.getRepository(UserOrganization);
    return repo.save(
      repo.create({
        userId,
        organizationId,
        role,
        isActive: true,
        joinedAt: new Date(),
      }),
    );
  }

  async function createTestUser(
    email: string,
    firstName: string,
    organizationId: string,
    role: string,
  ): Promise<User> {
    const repo = dataSource.getRepository(User);
    const password = await bcrypt.hash('password123', 10);
    return repo.save(
      repo.create({
        email,
        password,
        firstName,
        lastName: 'Test',
        organizationId,
        role,
        isActive: true,
        isEmailVerified: true,
      }),
    );
  }

  async function createTestWorkspace(
    name: string,
    organizationId: string,
    ownerId: string,
  ): Promise<Workspace> {
    const repo = dataSource.getRepository(Workspace);
    const saved = await repo.save(
      repo.create({
        name,
        slug: `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
        organizationId,
        createdBy: ownerId,
        ownerId,
        isPrivate: false,
      }),
    );
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async function createWorkspaceMember(
    workspaceId: string,
    organizationId: string,
    userId: string,
    role:
      | 'workspace_owner'
      | 'workspace_member'
      | 'workspace_viewer'
      | 'delivery_owner'
      | 'stakeholder',
  ) {
    const repo = dataSource.getRepository(WorkspaceMember);
    const saved = await repo.save(
      repo.create({ workspaceId, organizationId, userId, role }),
    );
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async function createTestProject(
    name: string,
    organizationId: string,
    workspaceId: string,
  ): Promise<Project> {
    const repo = dataSource.getRepository(Project);
    return repo.save(
      repo.create({
        name,
        organizationId,
        workspaceId,
        status: ProjectStatus.PLANNING,
        priority: ProjectPriority.MEDIUM,
        riskLevel: ProjectRiskLevel.MEDIUM,
      }),
    );
  }

  async function createTask(
    title: string,
    organizationId: string,
    workspaceId: string,
    projectId: string,
    assigneeUserId: string,
    status: string,
    dueDate: string | null,
  ): Promise<WorkTask> {
    const repo = dataSource.getRepository(WorkTask);
    return repo.save(
      repo.create({
        title,
        organizationId,
        workspaceId,
        projectId,
        assigneeUserId,
        status,
        dueDate: dueDate ? (dueDate as unknown as Date) : null,
      }),
    );
  }

  async function getAuthToken(email: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: 'password123' })
      .expect((r) => {
        if (r.status !== 200 && r.status !== 201) {
          throw new Error(`login expected 200/201, got ${r.status}`);
        }
      });
    return res.body.accessToken || res.body.token;
  }
});
