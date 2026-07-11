/**
 * @canonical (project layer)
 * Phase 4.6 / TC-F3: useProjectPermissions
 *
 * Single capability layer for project-level UI gating. Reads the workspace
 * role for the *project's* workspace (not the global active workspace, which
 * may differ on deep-links) and normalizes the role vocabulary so callers
 * never compare raw role strings.
 *
 * The /workspaces/:id/role endpoint returns one of:
 *   'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST'
 *
 * TC-F3 / TC-B1: Save as template is platform-ADMIN only (RequireOrgRole admin
 * on the backend). Duplicate remains elevated workspace OWNER/ADMIN.
 *
 * Why a hook instead of a string compare:
 *   - Eliminates the role-vocabulary mismatch class of bugs.
 *   - Centralizes future capability changes (e.g. Phase 5 governance).
 *   - Pulls role for the *correct* workspace, fixing the deep-link case.
 */
import { useAuth } from '@/state/AuthContext';
import { isPlatformAdmin } from '@/utils/access';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import type { ProjectDetail } from '../projects.api';

export interface ProjectPermissions {
  /** True for any user that can edit the project (OWNER, ADMIN, MEMBER). */
  canEdit: boolean;
  /** True only for platform ADMIN (TC-B1 / TC-F3). */
  canSaveAsTemplate: boolean;
  /** True only for elevated workspace roles (OWNER, ADMIN). */
  canDuplicateProject: boolean;
  /** Raw normalized role for diagnostics; do not compare directly in UI. */
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST' | null;
  loading: boolean;
}

const ELEVATED = new Set(['OWNER', 'ADMIN']);
const WRITERS = new Set(['OWNER', 'ADMIN', 'MEMBER']);

export function useProjectPermissions(
  project: Pick<ProjectDetail, 'workspaceId'> | null,
): ProjectPermissions {
  const { user } = useAuth();
  const { role, loading } = useWorkspaceRole(project?.workspaceId ?? null);
  const normalized = (role ?? null) as ProjectPermissions['role'];

  return {
    role: normalized,
    loading,
    canEdit: normalized ? WRITERS.has(normalized) : false,
    canSaveAsTemplate: isPlatformAdmin(user),
    canDuplicateProject: normalized ? ELEVATED.has(normalized) : false,
  };
}
