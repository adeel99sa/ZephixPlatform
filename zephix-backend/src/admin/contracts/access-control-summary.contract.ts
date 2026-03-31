import {
  LEGACY_ROLE_MAPPING,
  PlatformRole,
} from '../../common/auth/platform-roles';
import {
  WORKSPACE_ROLE_HIERARCHY,
  WorkspaceRole,
} from '../../shared/enums/workspace-roles.enum';

type PlatformRoleSummary = {
  role: PlatformRole;
  canCreateWorkspaces: boolean;
  canManageOrganizationGovernance: boolean;
  defaultAccessMode: 'read_write' | 'read_only';
};

type WorkspaceRoleSummary = {
  role: WorkspaceRole;
  hierarchyRank: number;
  mutable: boolean;
};

export type AccessControlSummaryContract = {
  platformRoles: PlatformRoleSummary[];
  workspaceRoles: WorkspaceRoleSummary[];
  roleMappings: Array<{ legacyRole: string; normalizedRole: PlatformRole }>;
  policyNotes: string[];
};

const POLICY_NOTES: string[] = [
  'Platform role is the source of truth for organization-level access.',
  'Workspace role controls access inside a workspace boundary.',
  'Project-only shares remain separate from workspace membership.',
];

function toPlatformRoleSummary(role: PlatformRole): PlatformRoleSummary {
  const isAdmin = role === PlatformRole.ADMIN;
  return {
    role,
    canCreateWorkspaces: isAdmin,
    canManageOrganizationGovernance: isAdmin,
    defaultAccessMode:
      role === PlatformRole.VIEWER ? 'read_only' : 'read_write',
  };
}

function toWorkspaceRoleSummary(
  [role, rank]: [WorkspaceRole, number],
): WorkspaceRoleSummary {
  return {
    role,
    hierarchyRank: rank,
    mutable: role !== 'workspace_viewer',
  };
}

export function buildAccessControlSummaryContract(): AccessControlSummaryContract {
  return {
    platformRoles: Object.values(PlatformRole).map(toPlatformRoleSummary),
    workspaceRoles: (
      Object.entries(WORKSPACE_ROLE_HIERARCHY) as Array<[WorkspaceRole, number]>
    ).map(toWorkspaceRoleSummary),
    roleMappings: Object.entries(LEGACY_ROLE_MAPPING).map(
      ([legacyRole, normalizedRole]) => ({
        legacyRole,
        normalizedRole,
      }),
    ),
    policyNotes: POLICY_NOTES,
  };
}
