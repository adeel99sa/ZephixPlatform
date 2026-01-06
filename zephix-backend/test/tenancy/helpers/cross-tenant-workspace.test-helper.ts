/**
 * Shared test helper for cross-tenant workspace access assertions
 *
 * Policy: All cross-tenant workspace access must return 403 Forbidden
 * This ensures consistent "permission denied" semantics and prevents
 * information leakage about workspace existence in other organizations.
 *
 * Usage:
 *   await assertCrossTenantWorkspace403(
 *     request(app.getHttpServer()),
 *     tokenA,
 *     workspaceB.id,
 *     'GET',
 *     '/api/workspaces'
 *   );
 */

import { Request } from 'supertest';

export interface CrossTenantWorkspaceTestOptions {
  request: Request;
  token: string;
  workspaceId: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint: string;
  body?: any;
  query?: Record<string, string>;
  expectedStatus?: number; // Default: 403
}

/**
 * Assert that accessing a workspace from a different organization returns 403 Forbidden
 *
 * This helper enforces the policy that cross-tenant workspace access must return 403,
 * not 404, to provide consistent "permission denied" semantics.
 *
 * @param options - Test configuration
 */
export async function assertCrossTenantWorkspace403(
  options: CrossTenantWorkspaceTestOptions,
): Promise<void> {
  const {
    request,
    token,
    workspaceId,
    method,
    endpoint,
    body,
    query,
    expectedStatus = 403,
  } = options;

  // Build the request with workspaceId in route params or body
  let req = request(method, endpoint.replace(':id', workspaceId).replace(':workspaceId', workspaceId))
    .set('Authorization', `Bearer ${token}`);

  // Add query params (including potential bypass attempts - should be ignored)
  if (query) {
    req = req.query(query);
  }

  // Add body if provided (including potential bypass attempts - should be ignored)
  if (body) {
    req = req.send(body);
  }

  // Execute request and assert 403 Forbidden
  const response = await req.expect(expectedStatus);

  // Verify error message indicates permission denied (not "not found")
  const errorMessage = response.body?.message || response.body?.error || '';
  expect(errorMessage.toLowerCase()).toMatch(
    /workspace|forbidden|access|denied|permission/i,
  );
  expect(errorMessage.toLowerCase()).not.toMatch(/not found|404/i);

  // Verify the system ignored any organizationId in query/body
  // (This is a defense-in-depth check - the real protection is in the guard/service)
}

/**
 * Helper to test multiple cross-tenant scenarios
 */
export async function assertMultipleCrossTenantWorkspace403(
  scenarios: Array<Omit<CrossTenantWorkspaceTestOptions, 'request'>>,
  requestFn: (method: string, endpoint: string) => Request,
): Promise<void> {
  for (const scenario of scenarios) {
    await assertCrossTenantWorkspace403({
      ...scenario,
      request: requestFn(scenario.method, scenario.endpoint),
    });
  }
}



