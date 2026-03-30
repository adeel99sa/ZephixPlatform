import { PlatformRole } from '../../common/auth/platform-roles';
import {
  WORKSPACE_ROLE_HIERARCHY,
  WorkspaceRole,
} from '../../shared/enums/workspace-roles.enum';

type RoleAccessSummary = {
  role: PlatformRole;
  aiAdvisoryAccess: 'allowed_with_workspace_access' | 'no_access_without_workspace_access';
  visibilityMode: 'full_context' | 'redacted_viewer';
};

type WorkspaceRoleAccessSummary = {
  role: WorkspaceRole;
  hierarchyRank: number;
  canReadAdvisory: boolean;
};

export type AIGovernanceSummaryContract = {
  aiEnabled: boolean;
  advisoryOnly: boolean;
  policyVersion: string;
  dataTrainingStatement: string;
  roleAccess: RoleAccessSummary[];
  workspaceRoleAccess: WorkspaceRoleAccessSummary[];
  policyNotes: string[];
  editableControls: {
    policyEditingEnabled: boolean;
    reason: string;
  };
};

const POLICY_NOTES: string[] = [
  'AI in Zephix is advisory-only and does not persist mutations automatically.',
  'Workspace access checks are enforced before any advisory response is returned.',
  'Viewer responses are redacted to least-privileged evidence.',
];

function toRoleAccess(role: PlatformRole): RoleAccessSummary {
  return {
    role,
    aiAdvisoryAccess: 'allowed_with_workspace_access',
    visibilityMode: role === PlatformRole.VIEWER ? 'redacted_viewer' : 'full_context',
  };
}

function toWorkspaceRoleAccess(
  [role, rank]: [WorkspaceRole, number],
): WorkspaceRoleAccessSummary {
  return {
    role,
    hierarchyRank: rank,
    canReadAdvisory: rank >= WORKSPACE_ROLE_HIERARCHY.workspace_viewer,
  };
}

export function buildAIGovernanceSummaryContract(): AIGovernanceSummaryContract {
  return {
    aiEnabled: true,
    advisoryOnly: true,
    policyVersion: 'AI_ADVISORY_V2',
    dataTrainingStatement:
      'No customer workspace content is used here for autonomous model-driven mutation.',
    roleAccess: Object.values(PlatformRole).map(toRoleAccess),
    workspaceRoleAccess: (
      Object.entries(WORKSPACE_ROLE_HIERARCHY) as Array<[WorkspaceRole, number]>
    ).map(toWorkspaceRoleAccess),
    policyNotes: POLICY_NOTES,
    editableControls: {
      policyEditingEnabled: false,
      reason: 'No admin policy settings contract exists in this phase.',
    },
  };
}
