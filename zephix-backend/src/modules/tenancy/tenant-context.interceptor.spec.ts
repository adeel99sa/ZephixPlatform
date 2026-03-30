import { ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { DataSource } from 'typeorm';
import { TenantContextInterceptor } from './tenant-context.interceptor';
import { TenantContextService } from './tenant-context.service';

const ORG = '38a4d55b-1ff5-4114-aad1-98891fd05edf';
const WS = '59c11206-351d-42b3-a79d-2af8b2982e29';

function makeContext(req: Partial<{
  path: string;
  method: string;
  user: any;
  headers: Record<string, string>;
  query: Record<string, string>;
  params: Record<string, string>;
}>): ExecutionContext {
  const request = {
    path: req.path ?? '/api/workspaces',
    method: req.method ?? 'GET',
    user: req.user,
    headers: req.headers ?? {},
    query: req.query ?? {},
    params: req.params ?? {},
  };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}

describe('TenantContextInterceptor', () => {
  let interceptor: TenantContextInterceptor;
  let tenantContextService: jest.Mocked<TenantContextService>;
  let workspaceFindOne: jest.Mock;
  let dataSource: DataSource;

  beforeEach(() => {
    workspaceFindOne = jest.fn();
    tenantContextService = {
      runWithTenant: jest.fn((_ctx, fn: () => Promise<unknown>) => fn()),
      getStore: jest.fn().mockReturnValue(new Map()),
    } as any;
    dataSource = {
      getRepository: jest.fn().mockReturnValue({
        findOne: workspaceFindOne,
      }),
    } as any;
    interceptor = new TenantContextInterceptor(
      tenantContextService,
      dataSource,
    );
  });

  describe('GET /api/workspaces bootstrap bypass', () => {
    it('does not validate x-workspace-id when path is /api/workspaces', async () => {
      const ctx = makeContext({
        path: '/api/workspaces',
        method: 'GET',
        user: { organizationId: ORG },
        headers: { 'x-workspace-id': WS },
      });
      const obs = await interceptor.intercept(ctx, { handle: () => of('ok') });
      await firstValueFrom(obs);
      expect(workspaceFindOne).not.toHaveBeenCalled();
      expect(tenantContextService.runWithTenant).toHaveBeenCalledWith(
        { organizationId: ORG, workspaceId: undefined },
        expect.any(Function),
      );
    });

    it('treats /api/workspaces/ (trailing slash) as bypass path', async () => {
      const ctx = makeContext({
        path: '/api/workspaces/',
        method: 'GET',
        user: { organizationId: ORG },
        headers: { 'x-workspace-id': WS },
      });
      const obs = await interceptor.intercept(ctx, { handle: () => of('ok') });
      await firstValueFrom(obs);
      expect(workspaceFindOne).not.toHaveBeenCalled();
    });
  });

  describe('workspace id extraction and validation', () => {
    it('validates query workspaceId for GET /api/projects', async () => {
      const ctx = makeContext({
        path: '/api/projects',
        method: 'GET',
        user: { organizationId: ORG },
        query: { workspaceId: WS },
      });
      workspaceFindOne.mockResolvedValue({ id: WS, organizationId: ORG });
      const obs = await interceptor.intercept(ctx, { handle: () => of('ok') });
      await firstValueFrom(obs);
      expect(workspaceFindOne).toHaveBeenCalledWith({
        where: { id: WS, organizationId: ORG },
      });
      expect(tenantContextService.runWithTenant).toHaveBeenCalledWith(
        { organizationId: ORG, workspaceId: WS },
        expect.any(Function),
      );
    });

    it('validates route param workspaceId for /api/workspaces/:workspaceId/role', async () => {
      const ctx = makeContext({
        path: `/api/workspaces/${WS}/role`,
        method: 'GET',
        user: { organizationId: ORG },
        params: { workspaceId: WS },
      });
      workspaceFindOne.mockResolvedValue({ id: WS, organizationId: ORG });
      const obs = await interceptor.intercept(ctx, { handle: () => of('ok') });
      await firstValueFrom(obs);
      expect(workspaceFindOne).toHaveBeenCalled();
    });

    it('validates x-workspace-id header when not on bypass path', async () => {
      const ctx = makeContext({
        path: '/api/work/tasks',
        method: 'GET',
        user: { organizationId: ORG },
        headers: { 'x-workspace-id': WS },
      });
      workspaceFindOne.mockResolvedValue({ id: WS, organizationId: ORG });
      const obs = await interceptor.intercept(ctx, { handle: () => of('ok') });
      await firstValueFrom(obs);
      expect(workspaceFindOne).toHaveBeenCalled();
    });

    it('throws specific ForbiddenException when findOne returns null', async () => {
      const ctx = makeContext({
        path: '/api/projects',
        method: 'GET',
        user: { organizationId: ORG },
        query: { workspaceId: WS },
      });
      workspaceFindOne.mockResolvedValue(null);
      await expect(
        interceptor.intercept(ctx, { handle: () => of('ok') }),
      ).rejects.toThrow(/does not belong to your organization/);
    });

    it('throws generic Failed to validate workspace access when findOne throws', async () => {
      const ctx = makeContext({
        path: '/api/projects',
        method: 'GET',
        user: { organizationId: ORG },
        query: { workspaceId: WS },
      });
      workspaceFindOne.mockRejectedValue(new Error('db down'));
      await expect(
        interceptor.intercept(ctx, { handle: () => of('ok') }),
      ).rejects.toThrow(/Failed to validate workspace access/);
    });
  });
});
