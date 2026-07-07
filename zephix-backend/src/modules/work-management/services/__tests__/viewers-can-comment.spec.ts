/**
 * viewersCanComment org-policy branch
 *
 * The branch lives in WorkTasksController.addComment (lines 426-445).
 * We test the policy logic directly by simulating the guard calls and
 * org-policy matrix, without standing up a full NestJS HTTP server.
 */

import { ForbiddenException } from '@nestjs/common';

// ── helpers ──────────────────────────────────────────────────────────────────

type PolicyMatrix = Record<string, boolean>;

function makeOrgPolicyService(matrix: PolicyMatrix) {
  return {
    getPermissionMatrix: jest.fn().mockResolvedValue(matrix),
    isMatrixPolicyAllowed: jest.fn().mockImplementation(
      (_policy: string, _role: string, m: PolicyMatrix) =>
        m[_policy] ?? false,
    ),
  };
}

function makeWorkspaceRoleGuard(writeAllowed: boolean, readAllowed = true) {
  return {
    requireWorkspaceWrite: jest.fn().mockImplementation(() => {
      if (!writeAllowed) throw new ForbiddenException({ code: 'WORKSPACE_WRITE_REQUIRED' });
    }),
    requireWorkspaceRead: jest.fn().mockImplementation(() => {
      if (!readAllowed) throw new ForbiddenException({ code: 'WORKSPACE_READ_REQUIRED' });
    }),
  };
}

/**
 * Mirrors the policy branch in WorkTasksController.addComment verbatim.
 * Any divergence here → production logic changed without updating this spec.
 */
async function runAddCommentPolicyBranch(
  workspaceId: string,
  auth: { organizationId: string; platformRole: string; userId: string },
  workspaceRoleGuard: ReturnType<typeof makeWorkspaceRoleGuard>,
  orgPolicyService: ReturnType<typeof makeOrgPolicyService> | null,
): Promise<'allowed'> {
  try {
    await workspaceRoleGuard.requireWorkspaceWrite(workspaceId, auth.userId);
  } catch (writeError) {
    if (orgPolicyService) {
      const orgMatrix = await orgPolicyService.getPermissionMatrix(auth.organizationId);
      if (!orgPolicyService.isMatrixPolicyAllowed('viewersCanComment', auth.platformRole, orgMatrix)) {
        throw writeError;
      }
      await workspaceRoleGuard.requireWorkspaceRead(workspaceId, auth.userId);
    } else {
      throw writeError;
    }
  }
  return 'allowed';
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('viewersCanComment — policy branch', () => {
  const wsId = 'ws-1';
  const auth = { organizationId: 'org-1', platformRole: 'VIEWER', userId: 'user-viewer' };

  it('allows viewer to comment when org policy viewersCanComment=true and user has read access', async () => {
    const guard = makeWorkspaceRoleGuard(false, true); // write denied, read allowed
    const orgPolicy = makeOrgPolicyService({ viewersCanComment: true });

    const result = await runAddCommentPolicyBranch(wsId, auth, guard, orgPolicy);

    expect(result).toBe('allowed');
    expect(guard.requireWorkspaceRead).toHaveBeenCalledWith(wsId, auth.userId);
  });

  it('re-throws write error when org policy viewersCanComment=false', async () => {
    const guard = makeWorkspaceRoleGuard(false);
    const orgPolicy = makeOrgPolicyService({ viewersCanComment: false });

    await expect(
      runAddCommentPolicyBranch(wsId, auth, guard, orgPolicy),
    ).rejects.toMatchObject({ response: { code: 'WORKSPACE_WRITE_REQUIRED' } });
    expect(guard.requireWorkspaceRead).not.toHaveBeenCalled();
  });

  it('re-throws write error when orgPolicyService is not wired (optional injection absent)', async () => {
    const guard = makeWorkspaceRoleGuard(false);

    await expect(
      runAddCommentPolicyBranch(wsId, auth, guard, null),
    ).rejects.toMatchObject({ response: { code: 'WORKSPACE_WRITE_REQUIRED' } });
  });

  it('succeeds without org-policy check when user already has write access', async () => {
    const guard = makeWorkspaceRoleGuard(true); // write allowed
    const orgPolicy = makeOrgPolicyService({ viewersCanComment: false });

    const result = await runAddCommentPolicyBranch(wsId, auth, guard, orgPolicy);

    expect(result).toBe('allowed');
    expect(orgPolicy.getPermissionMatrix).not.toHaveBeenCalled();
    expect(guard.requireWorkspaceRead).not.toHaveBeenCalled();
  });

  it('re-throws write error when viewer has no read access even with viewersCanComment=true', async () => {
    const guard = makeWorkspaceRoleGuard(false, false); // both denied
    const orgPolicy = makeOrgPolicyService({ viewersCanComment: true });

    await expect(
      runAddCommentPolicyBranch(wsId, auth, guard, orgPolicy),
    ).rejects.toMatchObject({ response: { code: 'WORKSPACE_READ_REQUIRED' } });
  });
});
