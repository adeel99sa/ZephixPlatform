export {
  buildPermissionMatrixFixtures,
  tierBelow,
  tokenKeyForWorkspaceTier,
  type PermissionMatrixFixtures,
  type RequiredWorkspaceRoleForMatrix,
  type WorkspaceMembershipRole,
} from './fixtures';
export { supertestMethodBridge } from '../tenancy/helpers/cross-tenant-workspace.test-helper';
export {
  applyPathTemplate,
  createSupertestMethodFn,
  createTestRequest,
  type HttpMethod,
  type TestRequestContext,
} from './request-builder';
export {
  expectAccessible,
  expectAuditEvent,
  expectCrossTenantForbidden,
  expectForbidden,
  expectNotFound,
  expectUnauthenticated,
  execRequest,
  type AuditEventExpectation,
  type CrossTenantForbiddenArgs,
} from './assertions';
export {
  getMatrixTestCaseCount,
  runMatrixTest,
  type MatrixScope,
  type RunMatrixTestOptions,
  type TargetWorkspaceKey,
} from './matrix-test';
