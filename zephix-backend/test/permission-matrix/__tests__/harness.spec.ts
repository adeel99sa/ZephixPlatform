import type { INestApplication } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import {
  expectAccessible,
  expectAuditEvent,
  expectForbidden,
  expectNotFound,
  expectUnauthenticated,
} from '../assertions';
import { getMatrixTestCaseCount, runMatrixTest } from '../matrix-test';

describe('AD-027 permission-matrix harness (unit)', () => {
  it('getMatrixTestCaseCount: workspace → 5, org/platform → 4', () => {
    expect(getMatrixTestCaseCount('workspace')).toBe(5);
    expect(getMatrixTestCaseCount('org')).toBe(4);
    expect(getMatrixTestCaseCount('platform')).toBe(4);
  });

  it('expectAccessible accepts 2xx', () => {
    expectAccessible({ status: 200 });
    expectAccessible({ status: 204 });
  });

  it('expectForbidden defaults to 403', () => {
    expectForbidden({ status: 403 }, 403);
    expect(() => expectForbidden({ status: 200 }, 403)).toThrow();
  });

  it('expectForbidden honors 404 override', () => {
    expectForbidden({ status: 404 }, 404);
  });

  it('expectNotFound', () => {
    expectNotFound({ status: 404 });
    expect(() => expectNotFound({ status: 403 })).toThrow();
  });

  it('expectUnauthenticated', () => {
    expectUnauthenticated({ status: 401 });
    expect(() => expectUnauthenticated({ status: 200 })).toThrow();
  });

  it('runMatrixTest throws for non-workspace scope (v1)', () => {
    expect(() =>
      runMatrixTest('n/a', 'GET', '/api/x/:id', {
        app: {} as INestApplication,
        getFixtures: () => ({}) as never,
        scope: 'org',
        requiredWorkspaceRole: 'workspace_owner',
        targetWorkspace: 'workspaceA1',
      }),
    ).toThrow(/only scope "workspace"/);
  });

  it('expectAuditEvent returns true and logs (stub)', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const out = await expectAuditEvent({
      decision: 'DENY',
      endpoint: 'PATCH /api/workspaces/:id/settings',
      actorId: 'user-1',
      requiredRole: 'workspace_owner',
      actualRole: 'workspace_member',
    });
    expect(out).toBe(true);
    expect(log).toHaveBeenCalledWith(
      'AUDIT_EVENT_STUB',
      expect.objectContaining({ decision: 'DENY', actorId: 'user-1' }),
    );
    log.mockRestore();
  });
});
