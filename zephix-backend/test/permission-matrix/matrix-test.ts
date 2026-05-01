import type { INestApplication } from '@nestjs/common';
import {
  PermissionMatrixFixtures,
  RequiredWorkspaceRoleForMatrix,
  tierBelow,
  tokenKeyForWorkspaceTier,
} from './fixtures';
import {
  expectAccessible,
  expectCrossTenantForbidden,
  expectForbidden,
  expectUnauthenticated,
  execRequest,
} from './assertions';
import { applyPathTemplate, createTestRequest, type HttpMethod } from './request-builder';

export type MatrixScope = 'workspace' | 'org' | 'platform';

export type TargetWorkspaceKey = 'workspaceA1' | 'workspaceA2' | 'workspaceB1';

export interface RunMatrixTestOptions {
  app: INestApplication;
  /** Lazy access so fixtures can be created in `beforeAll` */
  getFixtures: () => PermissionMatrixFixtures;
  scope: MatrixScope;
  /** Workspace role required for success (maps to fixture tokens). */
  requiredWorkspaceRole: RequiredWorkspaceRoleForMatrix;
  /** Which workspace id is substituted into the path template. */
  targetWorkspace: TargetWorkspaceKey;
  body?: unknown;
  query?: Record<string, string>;
  /** Extra `:param` replacements beyond `id` / `workspaceId` / `wsId`. */
  extraPathParams?:
    | Record<string, string>
    | ((f: PermissionMatrixFixtures) => Record<string, string>);
  /**
   * When set, Test 5 uses this path (e.g. slug routes where `assertCrossTenantWorkspace403`
   * cannot derive the URL from `workspaceId` alone).
   */
  buildCrossTenantPath?: (
    f: PermissionMatrixFixtures,
    targetWorkspaceId: string,
  ) => string;
  /**
   * Status for generic forbidden (Tests 2–3). Default 403.
   * Use 404 for routes that mask existence (AD-027 — document per endpoint).
   */
  forbiddenStatus?: 403 | 404;
  /** Cross-tenant (Test 5). Default 403; use 404 when endpoint masks existence. */
  crossTenantExpectedStatus?: 403 | 404;
  /** Document-only until guard-audit lands (AD-027 Section 12). */
  action?: string;
}

export function getMatrixTestCaseCount(scope: MatrixScope): number {
  return scope === 'workspace' ? 5 : 4;
}

function workspaceIdOf(
  f: PermissionMatrixFixtures,
  key: TargetWorkspaceKey,
): string {
  return f[key].id;
}

function tokenForRequiredRole(f: PermissionMatrixFixtures, role: RequiredWorkspaceRoleForMatrix): string {
  const k = tokenKeyForWorkspaceTier(role);
  return f.tokens[k];
}

function tokenOneTierBelow(
  f: PermissionMatrixFixtures,
  required: RequiredWorkspaceRoleForMatrix,
): string {
  const below = tierBelow(required);
  if (!below) {
    return f.tokens.memberNoWorkspace;
  }
  const k = tokenKeyForWorkspaceTier(below);
  return f.tokens[k];
}

function resolveExtraPathParams(
  f: PermissionMatrixFixtures,
  extra?: RunMatrixTestOptions['extraPathParams'],
): Record<string, string> | undefined {
  if (extra === undefined) return undefined;
  return typeof extra === 'function' ? extra(f) : extra;
}

function buildPath(
  pathTemplate: string,
  workspaceId: string,
  extra?: Record<string, string>,
): string {
  const base = { id: workspaceId, workspaceId, wsId: workspaceId };
  return applyPathTemplate(pathTemplate, { ...base, ...extra });
}

/**
 * AD-027 Section 5 — generates standard matrix cases for an endpoint.
 * Workspace scope: 5 tests (includes mandatory cross-tenant isolation).
 * Org/platform scope: 4 tests (cross-tenant pattern differs; extend in later batch).
 */
export function runMatrixTest(
  describeTitle: string,
  method: HttpMethod,
  pathTemplate: string,
  opts: RunMatrixTestOptions,
): void {
  if (opts.scope !== 'workspace') {
    throw new Error(
      'permission-matrix runMatrixTest (v1): only scope "workspace" is implemented. Extend harness for org/platform batch.',
    );
  }

  describe(describeTitle, () => {
    const forbidden = opts.forbiddenStatus ?? 403;

    it('Test 1: required workspace role can access → success', async () => {
      const f = opts.getFixtures();
      const wsId = workspaceIdOf(f, opts.targetWorkspace);
      const path = buildPath(
        pathTemplate,
        wsId,
        resolveExtraPathParams(f, opts.extraPathParams),
      );
      const token = tokenForRequiredRole(f, opts.requiredWorkspaceRole);
      const res = await execRequest(
        createTestRequest(method, path, {
          app: opts.app,
          accessToken: token,
          body: opts.body,
          query: opts.query,
        }),
      );
      expectAccessible(res);
    });

    it('Test 2: role one tier below required → forbidden', async () => {
      const f = opts.getFixtures();
      const wsId = workspaceIdOf(f, opts.targetWorkspace);
      const path = buildPath(
        pathTemplate,
        wsId,
        resolveExtraPathParams(f, opts.extraPathParams),
      );
      const token = tokenOneTierBelow(f, opts.requiredWorkspaceRole);
      const res = await execRequest(
        createTestRequest(method, path, {
          app: opts.app,
          accessToken: token,
          body: opts.body,
          query: opts.query,
        }),
      );
      expectForbidden(res, forbidden);
    });

    it('Test 3: user in org but no workspace membership → forbidden', async () => {
      const f = opts.getFixtures();
      const wsId = workspaceIdOf(f, opts.targetWorkspace);
      const path = buildPath(
        pathTemplate,
        wsId,
        resolveExtraPathParams(f, opts.extraPathParams),
      );
      const res = await execRequest(
        createTestRequest(method, path, {
          app: opts.app,
          accessToken: f.tokens.memberNoWorkspace,
          body: opts.body,
          query: opts.query,
        }),
      );
      expectForbidden(res, forbidden);
    });

    it('Test 4: unauthenticated → 401', async () => {
      const f = opts.getFixtures();
      const wsId = workspaceIdOf(f, opts.targetWorkspace);
      const path = buildPath(
        pathTemplate,
        wsId,
        resolveExtraPathParams(f, opts.extraPathParams),
      );
      const res = await execRequest(
        createTestRequest(method, path, {
          app: opts.app,
          body: opts.body,
          query: opts.query,
        }),
      );
      expectUnauthenticated(res);
    });

    if (opts.scope === 'workspace') {
      it('Test 5: user with valid role in different org/workspace cannot access target workspace (cross-tenant)', async () => {
        const f = opts.getFixtures();
        const wsId = workspaceIdOf(f, opts.targetWorkspace);
        const expectedStatus = opts.crossTenantExpectedStatus ?? 403;
        if (opts.buildCrossTenantPath) {
          const path = opts.buildCrossTenantPath(f, wsId);
          const res = await execRequest(
            createTestRequest(method, path, {
              app: opts.app,
              accessToken: f.tokens.ownerB1,
              body: opts.body,
              query: opts.query,
            }),
          );
          expectForbidden(res, expectedStatus);
          return;
        }
        await expectCrossTenantForbidden({
          app: opts.app,
          token: f.tokens.ownerB1,
          workspaceId: wsId,
          method,
          endpointTemplate: pathTemplate,
          body: opts.body as object | undefined,
          query: opts.query,
          expectedStatus,
        });
      });
    }
  });
}
