import { Reflector } from '@nestjs/core';
import { WorkspacesController } from './workspaces.controller';
import { PlatformRole } from '../../common/auth/platform-roles';

/**
 * Ensures workspace creation stays aligned with org-level RBAC (admin-only),
 * without booting the full application or database.
 */
describe('WorkspacesController — POST workspace create RBAC metadata', () => {
  it('requires PlatformRole.ADMIN on create()', () => {
    const reflector = new Reflector();
    const required = reflector.get<string | undefined>(
      'requiredOrgRole',
      WorkspacesController.prototype.create,
    );
    expect(required).toBe(PlatformRole.ADMIN);
  });
});
