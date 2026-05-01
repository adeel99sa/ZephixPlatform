import { ArgumentsHost, ForbiddenException } from '@nestjs/common';
import { GuardAuditAuthzExceptionFilter } from './guard-audit-authz-exception.filter';

describe('GuardAuditAuthzExceptionFilter', () => {
  let filter: GuardAuditAuthzExceptionFilter;
  let audit: { recordGuardEvent: jest.Mock };
  let registry: { resolve: jest.Mock };
  const reply = jest.fn();
  const end = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    audit = { recordGuardEvent: jest.fn().mockResolvedValue({}) };
    registry = {
      resolve: jest.fn().mockReturnValue({
        action: 'config',
        scope: 'workspace',
        requiredRole: 'workspace_owner',
      }),
    };
    filter = new GuardAuditAuthzExceptionFilter(
      audit as any,
      registry as any,
      {
        httpAdapter: {
          isHeadersSent: () => false,
          reply,
          end,
        },
      } as any,
    );
  });

  function host(req: Record<string, unknown>): ArgumentsHost {
    const res = {};
    return {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
      getArgByIndex: (i: number) => (i === 0 ? req : res),
    } as ArgumentsHost;
  }

  it('emits DENY then delegates to BaseExceptionFilter', async () => {
    const req = {
      method: 'GET',
      originalUrl: '/api/probe/x',
      path: '/api/probe/x',
      headers: {},
      params: {},
      query: {},
      user: {
        id: '22222222-2222-4222-8222-222222222222',
        organizationId: '11111111-1111-4111-8111-111111111111',
        platformRole: 'ADMIN',
      },
    };

    await filter.catch(new ForbiddenException('no'), host(req));

    expect(registry.resolve).toHaveBeenCalledWith('GET', '/api/probe/x');
    expect(audit.recordGuardEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        decision: 'DENY',
        denyReason: 'no',
      }),
    );
    expect(reply).toHaveBeenCalled();
  });

  it('skips when registry has no audit metadata', async () => {
    registry.resolve.mockReturnValue(undefined);
    const req = {
      method: 'GET',
      originalUrl: '/api/x',
      path: '/api/x',
      headers: {},
      params: {},
      query: {},
      user: {
        id: '22222222-2222-4222-8222-222222222222',
        organizationId: '11111111-1111-4111-8111-111111111111',
      },
    };

    await filter.catch(new ForbiddenException(), host(req));

    expect(audit.recordGuardEvent).not.toHaveBeenCalled();
    expect(reply).toHaveBeenCalled();
  });

  it('propagates audit persistence failures', async () => {
    audit.recordGuardEvent.mockRejectedValueOnce(new Error('db'));
    const req = {
      method: 'GET',
      originalUrl: '/api/probe/x',
      path: '/api/probe/x',
      headers: {},
      params: {},
      query: {},
      user: {
        id: '22222222-2222-4222-8222-222222222222',
        organizationId: '11111111-1111-4111-8111-111111111111',
        platformRole: 'ADMIN',
      },
    };

    await expect(
      filter.catch(new ForbiddenException(), host(req)),
    ).rejects.toThrow('db');
  });
});
