import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  INestApplication,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectGovernanceController } from './controllers/project-governance.controller';
import { ProjectGovernanceService } from './services/project-governance.service';
import { ResponseService } from '../../shared/services/response.service';

function makeAuthGuard(): CanActivate {
  return {
    canActivate(context: ExecutionContext) {
      const req = context.switchToHttp().getRequest();
      const auth = req.headers.authorization as string | undefined;
      if (!auth) {
        throw new UnauthorizedException();
      }
      if (auth === 'Bearer no-access') {
        req.user = { id: 'no-access-user', organizationId: 'org-1', platformRole: 'MEMBER' };
        return true;
      }
      if (auth === 'Bearer viewer') {
        req.user = { id: 'viewer-user', organizationId: 'org-1', platformRole: 'VIEWER' };
        return true;
      }
      if (auth === 'Bearer admin') {
        req.user = { id: 'admin-user', organizationId: 'org-1', platformRole: 'ADMIN' };
        return true;
      }
      req.user = { id: 'member-user', organizationId: 'org-1', platformRole: 'MEMBER' };
      return true;
    },
  };
}

describe('project-governance.controller transport contract', () => {
  let app: INestApplication;

  const governanceService = {
    listApprovals: jest.fn(),
    getApprovalById: jest.fn(),
    createApproval: jest.fn(),
    submitApproval: jest.fn(),
    decideApproval: jest.fn(),
    decideApprovalGate: jest.fn(),
    listRaid: jest.fn(),
    getRaidById: jest.fn(),
    createRaid: jest.fn(),
    updateRaid: jest.fn(),
    listReports: jest.fn(),
    getReportById: jest.fn(),
    createReport: jest.fn(),
    updateReport: jest.fn(),
    getDependencies: jest.fn(),
    getApprovalReadiness: jest.fn(),
    resumeFromHold: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProjectGovernanceController],
      providers: [
        ResponseService,
        { provide: ProjectGovernanceService, useValue: governanceService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(makeAuthGuard())
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    governanceService.listApprovals.mockImplementation(async (auth: any, _ws: string) => {
      if (auth.userId === 'no-access-user') {
        throw new ForbiddenException('Project access denied');
      }
      return { items: [], total: 0 };
    });
    governanceService.getApprovalById.mockImplementation(async (auth: any, _ws: string, projectId: string, approvalId: string) => {
      if (auth.userId === 'no-access-user') {
        throw new ForbiddenException('Project access denied');
      }
      if (projectId === 'p-1' && approvalId === 'foreign-approval') {
        throw new NotFoundException('Approval not found');
      }
      return { id: approvalId, status: 'DRAFT' };
    });
    governanceService.createApproval.mockImplementation(async (auth: any) => {
      if (auth.userId === 'viewer-user') throw new ForbiddenException('Viewers cannot modify governance records');
      if (auth.userId === 'no-access-user') throw new ForbiddenException('Project access denied');
      return { id: 'a-new', status: 'DRAFT' };
    });
    governanceService.submitApproval.mockImplementation(async (auth: any, _ws: string, _projectId: string, approvalId: string) => {
      if (auth.userId === 'viewer-user') throw new ForbiddenException('Viewers cannot modify governance records');
      if (auth.userId === 'no-access-user') throw new ForbiddenException('Project access denied');
      if (approvalId === 'blocked-approval') {
        throw new BadRequestException({
          code: 'APPROVAL_NOT_READY',
          status: 'not_ready',
          blockingReasons: ['Open task dependencies are still unresolved'],
          missingEvidence: ['1 required document(s) still missing'],
          missingApprovers: ['No active approver steps are configured'],
          openDependencies: [{ id: 'd-1' }],
        });
      }
      return { id: approvalId, status: 'SUBMITTED' };
    });
    governanceService.decideApproval.mockImplementation(async (auth: any) => {
      if (auth.userId === 'viewer-user') throw new ForbiddenException('Viewers cannot modify governance records');
      if (auth.userId === 'no-access-user') throw new ForbiddenException('Project access denied');
      return { id: 'a-1', status: 'APPROVED' };
    });
    governanceService.decideApprovalGate.mockImplementation(async (auth: any) => {
      if (auth.userId === 'viewer-user') throw new ForbiddenException('Viewers cannot modify governance records');
      if (auth.userId === 'no-access-user') throw new ForbiddenException('Project access denied');
      return { id: 'a-1', status: 'APPROVED' };
    });
    governanceService.listRaid.mockImplementation(async (auth: any) => {
      if (auth.userId === 'no-access-user') throw new ForbiddenException('Project access denied');
      return { items: [{ id: 'r-1', title: 'Risk 1', projectId: 'p-1' }], total: 1 };
    });
    governanceService.getRaidById.mockImplementation(async (auth: any, _ws: string, projectId: string, itemId: string) => {
      if (auth.userId === 'no-access-user') throw new ForbiddenException('Project access denied');
      if (projectId === 'p-1' && itemId === 'foreign-raid') throw new NotFoundException('RAID item not found');
      return { id: itemId, type: 'RISK' };
    });
    governanceService.createRaid.mockImplementation(async (auth: any) => {
      if (auth.userId === 'viewer-user') throw new ForbiddenException('Viewers cannot modify governance records');
      if (auth.userId === 'no-access-user') throw new ForbiddenException('Project access denied');
      return { id: 'raid-new' };
    });
    governanceService.updateRaid.mockImplementation(async (auth: any) => {
      if (auth.userId === 'viewer-user') throw new ForbiddenException('Viewers cannot modify governance records');
      if (auth.userId === 'no-access-user') throw new ForbiddenException('Project access denied');
      return { id: 'raid-1' };
    });
    governanceService.listReports.mockImplementation(async (auth: any) => {
      if (auth.userId === 'no-access-user') throw new ForbiddenException('Project access denied');
      return { items: [], total: 0 };
    });
    governanceService.getReportById.mockImplementation(async (auth: any, _ws: string, projectId: string, reportId: string) => {
      if (auth.userId === 'no-access-user') throw new ForbiddenException('Project access denied');
      if (projectId === 'p-1' && reportId === 'foreign-report') throw new NotFoundException('Report not found');
      return { id: reportId, title: 'Report 1' };
    });
    governanceService.createReport.mockImplementation(async (auth: any) => {
      if (auth.userId === 'viewer-user') throw new ForbiddenException('Viewers cannot modify governance records');
      if (auth.userId === 'no-access-user') throw new ForbiddenException('Project access denied');
      return { id: 'rep-new' };
    });
    governanceService.updateReport.mockImplementation(async (auth: any) => {
      if (auth.userId === 'viewer-user') throw new ForbiddenException('Viewers cannot modify governance records');
      if (auth.userId === 'no-access-user') throw new ForbiddenException('Project access denied');
      return { id: 'rep-1' };
    });
    governanceService.getDependencies.mockImplementation(async (auth: any) => {
      if (auth.userId === 'no-access-user') throw new ForbiddenException('Project access denied');
      return {
        blockedCount: 1,
        tasks: [{ id: 't-1', projectId: 'p-1' }],
        dependencies: [{ id: 'd-1', predecessorStatus: 'BLOCKED', successorStatus: 'TODO' }],
      };
    });
    governanceService.getApprovalReadiness.mockResolvedValue({
      items: [
        {
          approvalId: 'a-1',
          ready: false,
          status: 'not_ready',
          blockingReasons: ['Open task dependencies are still unresolved'],
          missingEvidence: ['1 required document(s) still missing'],
          missingApprovers: ['No active approver steps are configured'],
          openDependencies: [{ id: 'd-1' }],
        },
      ],
    });
    governanceService.resumeFromHold.mockImplementation(async (auth: any) => {
      if (auth.userId === 'no-access-user') throw new ForbiddenException('Project access denied');
      return { projectId: 'p-1', state: 'ACTIVE' };
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    ['GET', '/projects/p-1/approvals'],
    ['POST', '/projects/p-1/approvals'],
    ['POST', '/projects/p-1/approvals/a-1/submit'],
    ['POST', '/projects/p-1/approvals/a-1/decision'],
    ['POST', '/projects/p-1/approvals/a-1/decide'],
    ['POST', '/projects/p-1/raid'],
    ['PATCH', '/projects/p-1/raid/r-1'],
    ['POST', '/projects/p-1/reports'],
    ['PATCH', '/projects/p-1/reports/rep-1'],
    ['POST', '/projects/p-1/governance/resume-from-hold'],
  ])('returns 401 for unauthenticated %s %s', async (method, path) => {
    const req = request(app.getHttpServer());
    if (method === 'GET') await req.get(path).set('x-workspace-id', '11111111-1111-1111-1111-111111111111').expect(401);
    if (method === 'POST') await req.post(path).set('x-workspace-id', '11111111-1111-1111-1111-111111111111').expect(401);
    if (method === 'PATCH') await req.patch(path).set('x-workspace-id', '11111111-1111-1111-1111-111111111111').expect(401);
  });

  it('returns 403 for no-project-access user on read endpoints', async () => {
    await request(app.getHttpServer())
      .get('/projects/p-1/approvals')
      .set('Authorization', 'Bearer no-access')
      .set('x-workspace-id', '11111111-1111-1111-1111-111111111111')
      .expect(403);

    await request(app.getHttpServer())
      .get('/projects/p-1/raid')
      .set('Authorization', 'Bearer no-access')
      .set('x-workspace-id', '11111111-1111-1111-1111-111111111111')
      .expect(403);

    await request(app.getHttpServer())
      .get('/projects/p-1/reports')
      .set('Authorization', 'Bearer no-access')
      .set('x-workspace-id', '11111111-1111-1111-1111-111111111111')
      .expect(403);
  });

  it('POST governance/resume-from-hold returns wrapped payload', async () => {
    const res = await request(app.getHttpServer())
      .post('/projects/p-1/governance/resume-from-hold')
      .set('Authorization', 'Bearer admin')
      .set('x-workspace-id', '11111111-1111-1111-1111-111111111111')
      .expect(201);
    expect(res.body.data).toEqual({ projectId: 'p-1', state: 'ACTIVE' });
    expect(governanceService.resumeFromHold).toHaveBeenCalled();
  });

  it('does not leak details on cross-project lookups', async () => {
    await request(app.getHttpServer())
      .get('/projects/p-1/approvals/foreign-approval')
      .set('Authorization', 'Bearer member')
      .set('x-workspace-id', '11111111-1111-1111-1111-111111111111')
      .expect(404);

    await request(app.getHttpServer())
      .get('/projects/p-1/raid/foreign-raid')
      .set('Authorization', 'Bearer member')
      .set('x-workspace-id', '11111111-1111-1111-1111-111111111111')
      .expect(404);

    await request(app.getHttpServer())
      .get('/projects/p-1/reports/foreign-report')
      .set('Authorization', 'Bearer member')
      .set('x-workspace-id', '11111111-1111-1111-1111-111111111111')
      .expect(404);
  });

  it('blocks viewer mutations and allows member/admin mutations', async () => {
    await request(app.getHttpServer())
      .post('/projects/p-1/approvals')
      .set('Authorization', 'Bearer viewer')
      .set('x-workspace-id', '11111111-1111-1111-1111-111111111111')
      .send({ phaseId: '11111111-1111-1111-1111-111111111111', gateDefinitionId: '22222222-2222-2222-2222-222222222222' })
      .expect(403);

    await request(app.getHttpServer())
      .post('/projects/p-1/raid')
      .set('Authorization', 'Bearer viewer')
      .set('x-workspace-id', '11111111-1111-1111-1111-111111111111')
      .send({ type: 'ACTION', title: 'Action A' })
      .expect(403);

    await request(app.getHttpServer())
      .post('/projects/p-1/reports')
      .set('Authorization', 'Bearer viewer')
      .set('x-workspace-id', '11111111-1111-1111-1111-111111111111')
      .send({ title: 'Weekly report' })
      .expect(403);

    await request(app.getHttpServer())
      .post('/projects/p-1/approvals/a-1/submit')
      .set('Authorization', 'Bearer viewer')
      .set('x-workspace-id', '11111111-1111-1111-1111-111111111111')
      .expect(403);

    await request(app.getHttpServer())
      .post('/projects/p-1/approvals/a-1/decision')
      .set('Authorization', 'Bearer viewer')
      .set('x-workspace-id', '11111111-1111-1111-1111-111111111111')
      .send({ decision: 'APPROVE', reason: 'ok' })
      .expect(403);

    await request(app.getHttpServer())
      .post('/projects/p-1/approvals/a-1/decide')
      .set('Authorization', 'Bearer viewer')
      .set('x-workspace-id', '11111111-1111-1111-1111-111111111111')
      .send({ decision: 'GO', notes: '' })
      .expect(403);

    await request(app.getHttpServer())
      .patch('/projects/p-1/raid/raid-1')
      .set('Authorization', 'Bearer viewer')
      .set('x-workspace-id', '11111111-1111-1111-1111-111111111111')
      .send({ title: 'updated' })
      .expect(403);

    await request(app.getHttpServer())
      .patch('/projects/p-1/reports/rep-1')
      .set('Authorization', 'Bearer viewer')
      .set('x-workspace-id', '11111111-1111-1111-1111-111111111111')
      .send({ title: 'updated report' })
      .expect(403);

    await request(app.getHttpServer())
      .post('/projects/p-1/raid')
      .set('Authorization', 'Bearer member')
      .set('x-workspace-id', '11111111-1111-1111-1111-111111111111')
      .send({ type: 'ACTION', title: 'Action A' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/projects/p-1/approvals/a-1/submit')
      .set('Authorization', 'Bearer member')
      .set('x-workspace-id', '11111111-1111-1111-1111-111111111111')
      .expect(201);

    await request(app.getHttpServer())
      .post('/projects/p-1/approvals/a-1/decision')
      .set('Authorization', 'Bearer member')
      .set('x-workspace-id', '11111111-1111-1111-1111-111111111111')
      .send({ decision: 'APPROVE', reason: 'ok' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/projects/p-1/approvals/a-1/decide')
      .set('Authorization', 'Bearer member')
      .set('x-workspace-id', '11111111-1111-1111-1111-111111111111')
      .send({ decision: 'GO', notes: '' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/projects/p-1/reports')
      .set('Authorization', 'Bearer admin')
      .set('x-workspace-id', '11111111-1111-1111-1111-111111111111')
      .send({ title: 'Weekly report' })
      .expect(201);
  });

  it('returns readiness structured contract and submit not-ready payload', async () => {
    const readinessRes = await request(app.getHttpServer())
      .get('/projects/p-1/approval-readiness')
      .set('Authorization', 'Bearer member')
      .set('x-workspace-id', '11111111-1111-1111-1111-111111111111')
      .expect(200);

    const row = readinessRes.body?.data?.items?.[0];
    expect(row).toHaveProperty('ready');
    expect(row).toHaveProperty('status');
    expect(row).toHaveProperty('blockingReasons');
    expect(row).toHaveProperty('missingEvidence');
    expect(row).toHaveProperty('missingApprovers');
    expect(row).toHaveProperty('openDependencies');

    const submitRes = await request(app.getHttpServer())
      .post('/projects/p-1/approvals/blocked-approval/submit')
      .set('Authorization', 'Bearer member')
      .set('x-workspace-id', '11111111-1111-1111-1111-111111111111')
      .expect(400);

    expect(JSON.stringify(submitRes.body)).toContain('APPROVAL_NOT_READY');
  });

  it('returns dependencies payload scoped to requested project', async () => {
    const res = await request(app.getHttpServer())
      .get('/projects/p-1/dependencies')
      .set('Authorization', 'Bearer member')
      .set('x-workspace-id', '11111111-1111-1111-1111-111111111111')
      .expect(200);

    expect(res.body?.data?.blockedCount).toBe(1);
    expect(Array.isArray(res.body?.data?.dependencies)).toBe(true);
    expect(res.body?.data?.tasks?.every((t: any) => t.projectId === 'p-1')).toBe(true);
  });
});
