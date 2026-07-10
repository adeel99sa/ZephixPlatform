import { Reflector } from '@nestjs/core';
import { ProjectsController } from './projects.controller';
import { RequireOrgRoleGuard } from '../workspaces/guards/require-org-role.guard';
import { RequireProjectWorkspaceRoleGuard } from './guards/require-project-workspace-role.guard';

/**
 * TC-B1 — save-as-template is admin-only (founder ladder). The workspace_owner
 * path is removed. This asserts the guard wiring so the 403-for-non-admin
 * contract can't silently regress to a workspace-role check. (End-to-end 403 is
 * proven live in the Stage 2 gate.)
 */
describe('ProjectsController.saveAsTemplate — TC-B1 admin-only guard', () => {
  const reflector = new Reflector();
  const handler = ProjectsController.prototype.saveAsTemplate;

  it('is guarded by RequireOrgRoleGuard, not the workspace-role guard', () => {
    const guards =
      reflector.get<any[]>('__guards__', handler) ?? [];
    const guardNames = guards.map((g) => (g?.name ?? g?.constructor?.name));
    expect(guardNames).toContain(RequireOrgRoleGuard.name);
    expect(guardNames).not.toContain(RequireProjectWorkspaceRoleGuard.name);
  });

  it("requires the 'admin' org role", () => {
    const required = reflector.get<string>('requiredOrgRole', handler);
    expect(required).toBe('admin');
  });
});
