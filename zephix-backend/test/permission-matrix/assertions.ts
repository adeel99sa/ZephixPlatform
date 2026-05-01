import { expect } from '@jest/globals';
import { assertCrossTenantWorkspace403 } from '../tenancy/helpers/cross-tenant-workspace.test-helper';
import type { INestApplication } from '@nestjs/common';
import type { Test } from 'supertest';
import { createSupertestMethodFn } from './request-builder';

export interface AuditEventExpectation {
  decision: 'ALLOW' | 'DENY';
  endpoint: string;
  actorId: string;
  requiredRole: string;
  actualRole: string;
}

/**
 * AD-027 Section 12.3 — Guard-audit correlation (deferred).
 * TODO: wire when `GuardAuditInterceptor` lands; assert `audit_events` row.
 *
 * @returns always `true`; does not throw. Logs expected shape for future wiring.
 */
export async function expectAuditEvent(
  args: AuditEventExpectation,
): Promise<true> {
  console.log('AUDIT_EVENT_STUB', args);
  return true;
}

/** Response shape from supertest (superagent). */
export function expectAccessible(res: { status: number }): void {
  expect(res.status).toBeGreaterThanOrEqual(200);
  expect(res.status).toBeLessThan(300);
}

export function expectForbidden(
  res: { status: number },
  expectedStatus: 403 | 404 = 403,
): void {
  expect(res.status).toBe(expectedStatus);
}

export function expectNotFound(res: { status: number }): void {
  expect(res.status).toBe(404);
}

export function expectUnauthenticated(res: { status: number }): void {
  expect(res.status).toBe(401);
}

export interface CrossTenantForbiddenArgs {
  app: INestApplication;
  token: string;
  workspaceId: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Path with :id or :workspaceId placeholder; replaced by shared helper */
  endpointTemplate: string;
  body?: object;
  query?: Record<string, string>;
  /** Default 403 per platform policy; override to 404 for existence-masking routes */
  expectedStatus?: 403 | 404;
}

/**
 * Test 5 (workspace scope): reuses `assertCrossTenantWorkspace403` — do not duplicate
 * cross-tenant assertion logic.
 */
export async function expectCrossTenantForbidden(
  args: CrossTenantForbiddenArgs,
): Promise<void> {
  const requestFn = createSupertestMethodFn(args.app);
  // supertest agent is not typed as `(method, path) => Test`; bridge matches `cross-tenant-workspace.test-helper` contract
  await assertCrossTenantWorkspace403({
    request: requestFn,
    token: args.token,
    workspaceId: args.workspaceId,
    method: args.method,
    endpoint: args.endpointTemplate,
    body: args.body,
    query: args.query,
    expectedStatus: args.expectedStatus ?? 403,
  });
}

/** Execute supertest chain and return response (does not assert status). */
export async function execRequest(chain: Test): Promise<{ status: number; body: unknown }> {
  const res = await chain;
  return { status: res.status, body: res.body };
}
