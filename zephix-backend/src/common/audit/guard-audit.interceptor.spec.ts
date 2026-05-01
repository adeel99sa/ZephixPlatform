import { lastValueFrom, of } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { GuardAuditInterceptor } from './guard-audit.interceptor';
import { AUDIT_GUARD_DECISION_METADATA_KEY } from './guard-audit.constants';

describe('GuardAuditInterceptor', () => {
  let interceptor: GuardAuditInterceptor;
  let audit: { recordGuardEvent: jest.Mock };
  let reflector: Reflector;

  function makeHandler() {
    return function probeHandler() {};
  }

  function httpCtx(handler: object, statusCode = 200) {
    return {
      getHandler: () => handler,
      switchToHttp: () => ({
        getResponse: () => ({ statusCode }),
        getRequest: () =>
          ({
            method: 'GET',
            path: '/api/probe',
            baseUrl: '',
            route: { path: '/probe' },
            headers: {},
            params: {},
            query: {},
            user: {
              id: '22222222-2222-4222-8222-222222222222',
              organizationId: '11111111-1111-4111-8111-111111111111',
              platformRole: 'ADMIN',
              email: 't@test.dev',
            },
          }) as any,
      }),
    } as any;
  }

  beforeEach(() => {
    audit = { recordGuardEvent: jest.fn().mockResolvedValue({}) };
    reflector = new Reflector();
    interceptor = new GuardAuditInterceptor(audit as any, reflector);
  });

  it('emits ALLOW for config action on 2xx', async () => {
    const handler = makeHandler();
    Reflect.defineMetadata(
      AUDIT_GUARD_DECISION_METADATA_KEY,
      {
        action: 'config',
        scope: 'workspace',
        requiredRole: 'workspace_owner',
      },
      handler,
    );

    await lastValueFrom(
      interceptor.intercept(httpCtx(handler), { handle: () => of({ ok: true }) }),
    );

    expect(audit.recordGuardEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        decision: 'ALLOW',
        requiredRole: 'workspace_owner',
      }),
    );
  });

  it('skips read action', async () => {
    const handler = makeHandler();
    Reflect.defineMetadata(
      AUDIT_GUARD_DECISION_METADATA_KEY,
      {
        action: 'read',
        scope: 'workspace',
        requiredRole: 'workspace_owner',
      },
      handler,
    );

    await lastValueFrom(
      interceptor.intercept(httpCtx(handler), { handle: () => of({ ok: true }) }),
    );

    expect(audit.recordGuardEvent).not.toHaveBeenCalled();
  });

  it('skips when decorator absent', async () => {
    const handler = makeHandler();
    await lastValueFrom(
      interceptor.intercept(httpCtx(handler), { handle: () => of({ ok: true }) }),
    );

    expect(audit.recordGuardEvent).not.toHaveBeenCalled();
  });

  it('skips non-2xx responses', async () => {
    const handler = makeHandler();
    Reflect.defineMetadata(
      AUDIT_GUARD_DECISION_METADATA_KEY,
      {
        action: 'config',
        scope: 'workspace',
        requiredRole: 'workspace_owner',
      },
      handler,
    );

    await lastValueFrom(
      interceptor.intercept(httpCtx(handler, 403), {
        handle: () => of(null),
      }),
    );

    expect(audit.recordGuardEvent).not.toHaveBeenCalled();
  });

  it('propagates when recordGuardEvent rejects', async () => {
    const handler = makeHandler();
    Reflect.defineMetadata(
      AUDIT_GUARD_DECISION_METADATA_KEY,
      {
        action: 'destructive',
        scope: 'workspace',
        requiredRole: 'workspace_owner',
      },
      handler,
    );
    audit.recordGuardEvent.mockRejectedValueOnce(new Error('audit failed'));

    await expect(
      lastValueFrom(
        interceptor.intercept(httpCtx(handler), { handle: () => of({ ok: true }) }),
      ),
    ).rejects.toThrow('audit failed');
  });
});
