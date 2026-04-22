/**
 * Phase 4.6 (Template Center hotfix): useProjectPermissions
 *
 * Single capability layer for project-level UI gating. Reads the workspace
 * role for the *project's* workspace (not the global active workspace, which
 * may differ on deep-links) and normalizes the role vocabulary so callers
 * never compare raw role strings.
 *
 * The /workspaces/:id/role endpoint returns one of:
 *   'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST'
 *
 * Internally, OWNER and ADMIN map to the same write capability set;
 * "elevated" capabilities (Save as template, Duplicate as project, etc.)
 * require OWNER or ADMIN.
 *
 * Why a hook instead of a string compare:
 *   - Eliminates the role-vocabulary mismatch class of bugs.
 *   - Centralizes future capability changes (e.g. Phase 5 governance).
 *   - Pulls role for the *correct* workspace, fixing the deep-link case.
 */
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import type { ProjectDetail } from '../projects.api';

export interface ProjectPermissions {
  /** True for any user that can edit the project (OWNER, ADMIN, MEMBER). */
  canEdit: boolean;
  /** True only for elevated roles (OWNER, ADMIN). */
  canSaveAsTemplate: boolean;
  /** True only for elevated roles (OWNER, ADMIN). */
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
  const { role, loading } = useWorkspaceRole(project?.workspaceId ?? null);
  const normalized = (role ?? null) as ProjectPermissions['role'];

  return {
    role: normalized,
    loading,
    canEdit: normalized ? WRITERS.has(normalized) : false,
    canSaveAsTemplate: normalized ? ELEVATED.has(normalized) : false,
    canDuplicateProject: normalized ? ELEVATED.has(normalized) : false,
  };
}
