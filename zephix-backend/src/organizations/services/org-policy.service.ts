/**
 * OrgPolicyService — Platform P-1 + MVP-5A: Centralized org-level permission policy resolution.
 *
 * Two JSONB sources in Organization.settings:
 *
 *   1. settings.permissions — org-level role permission matrix (Admin/Member/Viewer)
 *      Written by: Security → Org Permissions tab
 *      Serves: membersCanCreateTasks, membersCanDeleteOwnTasks, viewersCanComment
 *
 *   2. settings.workspacePermissionDefaults — workspace-level role defaults (Owner/Member/Viewer)
 *      Written by: Security → Workspace Permissions tab
 *      Serves: wsOwnersCanCreateProjects, wsOwnersCanDeleteProjects,
 *              wsOwnersCanInviteMembers, wsOwnersCanManagePermissions
 *
 * Platform ADMIN is never blocked by org policies (they set them).
 *
 * Exported from @Global() OrganizationsModule so all modules can inject
 * without explicit imports.
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../entities/organization.entity';

// ── P-1 Legacy Interface (deprecated, kept for backward compat) ────────────

export interface OrgPermissionPolicies {
  wsOwnersCanManagePermissions: boolean;
  wsOwnersCanInviteMembers: boolean;
  wsOwnersCanCreateProjects: boolean;
  wsOwnersCanDeleteProjects: boolean;
  membersCanCreateTasks: boolean;
  membersCanDeleteOwnTasks: boolean;
  viewersCanComment: boolean;
}

const DEFAULT_POLICIES: OrgPermissionPolicies = {
  wsOwnersCanManagePermissions: true,
  wsOwnersCanInviteMembers: true,
  wsOwnersCanCreateProjects: true,
  wsOwnersCanDeleteProjects: false,
  membersCanCreateTasks: true,
  membersCanDeleteOwnTasks: false,
  viewersCanComment: true,
};

// ── MVP-5A: Matrix Interfaces ──────────────────────────────────────────────

/**
 * Matrix structure written by Security → Org Permissions tab (Tab 1).
 * Stored at: Organization.settings.permissions
 */
export interface OrgPermissionMatrix {
  member: Record<string, boolean>;
  viewer: Record<string, boolean>;
}

/**
 * Matrix structure written by Security → Workspace Permissions tab (Tab 2).
 * Stored at: Organization.settings.workspacePermissionDefaults
 */
export interface WorkspacePermissionDefaults {
  owner: Record<string, boolean>;
  member: Record<string, boolean>;
  viewer: Record<string, boolean>;
}

// ── Default Matrices (key names match frontend exactly) ────────────────────

const DEFAULT_ORG_MATRIX: OrgPermissionMatrix = {
  member: {
    accessAdminConsole: false, inviteNewPeople: false, changePlatformRoles: false,
    createWorkspaces: false, deleteWorkspaces: false, manageBilling: false,
    viewAuditTrail: false, configureGovernance: false,
    createProjects: true, deleteProjects: false, assignProjectManager: false, manageProjectTeam: false,
    createTasks: true, editAnyTask: true, deleteOwnTasks: false, deleteOthersTasks: false,
    changeTaskStatus: true, assignTasks: true,
    createViews: true, createDashboards: true, customizeWorkspaceDashboard: false,
    commentOnTasks: true, uploadFiles: true, deleteFiles: false,
  },
  viewer: {
    accessAdminConsole: false, inviteNewPeople: false, changePlatformRoles: false,
    createWorkspaces: false, deleteWorkspaces: false, manageBilling: false,
    viewAuditTrail: false, configureGovernance: false,
    createProjects: false, deleteProjects: false, assignProjectManager: false, manageProjectTeam: false,
    createTasks: false, editAnyTask: false, deleteOwnTasks: false, deleteOthersTasks: false,
    changeTaskStatus: false, assignTasks: false,
    createViews: true, createDashboards: false, customizeWorkspaceDashboard: false,
    commentOnTasks: true, uploadFiles: true, deleteFiles: false,
  },
};

const DEFAULT_WORKSPACE_DEFAULTS: WorkspacePermissionDefaults = {
  owner: {
    editWorkspaceSettings: true, deleteWorkspace: true, manageWorkspaceMembers: true,
    customizePermissions: true, customizeDashboard: true, reorderSidebarContent: true,
    wsCreateProjects: true, wsDeleteProjects: true, wsAssignPM: true, wsManageProjectTeam: true,
    wsCreateTasks: true, wsEditAnyTask: true, wsDeleteOwnTasks: true, wsDeleteOthersTasks: true,
    wsChangeTaskStatus: true, wsAssignTasks: true,
    wsCreateViews: true, wsDeleteOwnViews: true, wsDeleteOthersViews: true, wsCreateDashboards: true,
    wsCommentOnTasks: true, wsUploadFiles: true, wsDeleteFiles: true, wsDeleteOthersComments: true,
  },
  member: {
    editWorkspaceSettings: false, deleteWorkspace: false, manageWorkspaceMembers: false,
    customizePermissions: false, customizeDashboard: true, reorderSidebarContent: true,
    wsCreateProjects: true, wsDeleteProjects: false, wsAssignPM: false, wsManageProjectTeam: false,
    wsCreateTasks: true, wsEditAnyTask: true, wsDeleteOwnTasks: false, wsDeleteOthersTasks: false,
    wsChangeTaskStatus: true, wsAssignTasks: true,
    wsCreateViews: true, wsDeleteOwnViews: true, wsDeleteOthersViews: false, wsCreateDashboards: true,
    wsCommentOnTasks: true, wsUploadFiles: true, wsDeleteFiles: false, wsDeleteOthersComments: false,
  },
  viewer: {
    editWorkspaceSettings: false, deleteWorkspace: false, manageWorkspaceMembers: false,
    customizePermissions: false, customizeDashboard: false, reorderSidebarContent: false,
    wsCreateProjects: false, wsDeleteProjects: false, wsAssignPM: false, wsManageProjectTeam: false,
    wsCreateTasks: false, wsEditAnyTask: false, wsDeleteOwnTasks: false, wsDeleteOthersTasks: false,
    wsChangeTaskStatus: false, wsAssignTasks: false,
    wsCreateViews: true, wsDeleteOwnViews: false, wsDeleteOthersViews: false, wsCreateDashboards: false,
    wsCommentOnTasks: true, wsUploadFiles: true, wsDeleteFiles: false, wsDeleteOthersComments: false,
  },
};

// ── Enforcement Key Maps ───────────────────────────────────────────────────

/**
 * Maps P-1 flat enforcement keys → org permission matrix paths.
 */
const ORG_ENFORCEMENT_MAP: Record<string, { role: 'member' | 'viewer'; matrixKey: string }> = {
  membersCanCreateTasks: { role: 'member', matrixKey: 'createTasks' },
  membersCanDeleteOwnTasks: { role: 'member', matrixKey: 'deleteOwnTasks' },
  viewersCanComment: { role: 'viewer', matrixKey: 'commentOnTasks' },
};

/**
 * Maps P-1 flat enforcement keys → workspace permission default paths.
 */
const WORKSPACE_ENFORCEMENT_MAP: Record<string, { role: 'owner' | 'member' | 'viewer'; matrixKey: string }> = {
  wsOwnersCanCreateProjects: { role: 'owner', matrixKey: 'wsCreateProjects' },
  wsOwnersCanDeleteProjects: { role: 'owner', matrixKey: 'wsDeleteProjects' },
  wsOwnersCanInviteMembers: { role: 'owner', matrixKey: 'manageWorkspaceMembers' },
  wsOwnersCanManagePermissions: { role: 'owner', matrixKey: 'customizePermissions' },
};

// ── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class OrgPolicyService {
  private readonly logger = new Logger(OrgPolicyService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
  ) {}

  // ── MVP-5A: Matrix-based methods ──────────────────────────────────────

  /**
   * Load org-level permission matrix.
   * Source: Organization.settings.permissions
   * Serves: membersCanCreateTasks, membersCanDeleteOwnTasks, viewersCanComment
   */
  async getPermissionMatrix(organizationId: string): Promise<OrgPermissionMatrix> {
    try {
      const org = await this.orgRepo.findOne({
        where: { id: organizationId },
        select: ['id', 'settings'],
      });
      if (!org) return this.deepCopy(DEFAULT_ORG_MATRIX);

      const stored = (org.settings as any)?.permissions || {};

      // Detect format: new matrix has 'member' object, old P-1 has flat keys
      const isMatrixFormat =
        typeof stored.member === 'object' || typeof stored.viewer === 'object';

      if (isMatrixFormat) {
        return {
          member: { ...DEFAULT_ORG_MATRIX.member, ...(stored.member || {}) },
          viewer: { ...DEFAULT_ORG_MATRIX.viewer, ...(stored.viewer || {}) },
        };
      }

      // Legacy P-1 flat format — convert to matrix
      return this.convertLegacyOrgPermissions(stored);
    } catch (error) {
      this.logger.warn('Failed to load org permission matrix, using defaults', {
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      return this.deepCopy(DEFAULT_ORG_MATRIX);
    }
  }

  /**
   * Load workspace-level permission defaults.
   * Source: Organization.settings.workspacePermissionDefaults
   * Serves: wsOwnersCanCreateProjects, wsOwnersCanDeleteProjects,
   *         wsOwnersCanInviteMembers, wsOwnersCanManagePermissions
   */
  async getWorkspacePermissionDefaults(
    organizationId: string,
  ): Promise<WorkspacePermissionDefaults> {
    try {
      const org = await this.orgRepo.findOne({
        where: { id: organizationId },
        select: ['id', 'settings'],
      });
      if (!org) return this.deepCopy(DEFAULT_WORKSPACE_DEFAULTS);

      const stored =
        (org.settings as any)?.workspacePermissionDefaults || {};

      return {
        owner: { ...DEFAULT_WORKSPACE_DEFAULTS.owner, ...(stored.owner || {}) },
        member: {
          ...DEFAULT_WORKSPACE_DEFAULTS.member,
          ...(stored.member || {}),
        },
        viewer: {
          ...DEFAULT_WORKSPACE_DEFAULTS.viewer,
          ...(stored.viewer || {}),
        },
      };
    } catch (error) {
      this.logger.warn(
        'Failed to load workspace permission defaults, using defaults',
        {
          organizationId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      return this.deepCopy(DEFAULT_WORKSPACE_DEFAULTS);
    }
  }

  /**
   * Check if a policy allows an action.
   *
   * Accepts P-1 flat keys (e.g., 'membersCanCreateTasks') and resolves them
   * through ORG_ENFORCEMENT_MAP or WORKSPACE_ENFORCEMENT_MAP to find the
   * correct value in the corresponding matrix.
   *
   * Platform ADMIN always returns true.
   */
  isMatrixPolicyAllowed(
    policyKey: string,
    platformRole: string | null | undefined,
    orgMatrix: OrgPermissionMatrix,
    workspaceDefaults?: WorkspacePermissionDefaults,
  ): boolean {
    if (this.isAdmin(platformRole)) return true;

    // Check org enforcement map first
    const orgMapping = ORG_ENFORCEMENT_MAP[policyKey];
    if (orgMapping) {
      const rolePermissions = orgMatrix[orgMapping.role];
      if (!rolePermissions) return true;
      const value = rolePermissions[orgMapping.matrixKey];
      return value !== undefined ? value : true;
    }

    // Check workspace enforcement map
    const wsMapping = WORKSPACE_ENFORCEMENT_MAP[policyKey];
    if (wsMapping && workspaceDefaults) {
      const rolePermissions = workspaceDefaults[wsMapping.role];
      if (!rolePermissions) return true;
      const value = rolePermissions[wsMapping.matrixKey];
      return value !== undefined ? value : true;
    }

    // Key not found in any map — default to allow (fail open)
    this.logger.warn(`Unknown policy key: ${policyKey} — defaulting to allow`);
    return true;
  }

  // ── Legacy P-1 methods (deprecated) ───────────────────────────────────

  /**
   * @deprecated Use getPermissionMatrix() + getWorkspacePermissionDefaults() instead.
   * Kept for backward compatibility during transition.
   */
  async getPolicies(organizationId: string): Promise<OrgPermissionPolicies> {
    try {
      const org = await this.orgRepo.findOne({
        where: { id: organizationId },
        select: ['id', 'settings'],
      });
      if (!org) return { ...DEFAULT_POLICIES };
      const stored = (org.settings as any)?.permissions || {};

      // If stored in matrix format, convert back to flat for legacy callers
      if (
        typeof stored.member === 'object' ||
        typeof stored.viewer === 'object'
      ) {
        return this.convertMatrixToFlat(stored);
      }

      return { ...DEFAULT_POLICIES, ...stored };
    } catch (error) {
      this.logger.warn('Failed to load org policies, using defaults', {
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      return { ...DEFAULT_POLICIES };
    }
  }

  /**
   * @deprecated Use isMatrixPolicyAllowed() instead.
   */
  isPolicyAllowed(
    policies: OrgPermissionPolicies,
    policyKey: keyof OrgPermissionPolicies,
    platformRole?: string | null,
  ): boolean {
    if (this.isAdmin(platformRole)) return true;
    return policies[policyKey] ?? DEFAULT_POLICIES[policyKey];
  }

  // ── Private helpers ───────────────────────────────────────────────────

  private isAdmin(platformRole?: string | null): boolean {
    const normalized = (platformRole || '').toUpperCase();
    return ['ADMIN', 'OWNER', 'ADMINISTRATOR'].includes(normalized);
  }

  /**
   * Convert P-1 flat keys to matrix format.
   * Handles orgs that saved permissions before MVP-5.
   */
  private convertLegacyOrgPermissions(
    legacy: Record<string, any>,
  ): OrgPermissionMatrix {
    const matrix: OrgPermissionMatrix = this.deepCopy(DEFAULT_ORG_MATRIX);

    for (const [legacyKey, mapping] of Object.entries(ORG_ENFORCEMENT_MAP)) {
      if (legacy[legacyKey] !== undefined) {
        matrix[mapping.role][mapping.matrixKey] = Boolean(legacy[legacyKey]);
      }
    }

    return matrix;
  }

  /**
   * Convert matrix format back to flat P-1 keys for deprecated getPolicies().
   */
  private convertMatrixToFlat(
    stored: Record<string, any>,
  ): OrgPermissionPolicies {
    const flat: OrgPermissionPolicies = { ...DEFAULT_POLICIES };

    for (const [legacyKey, mapping] of Object.entries(ORG_ENFORCEMENT_MAP)) {
      const roleData = stored[mapping.role];
      if (roleData && roleData[mapping.matrixKey] !== undefined) {
        (flat as any)[legacyKey] = Boolean(roleData[mapping.matrixKey]);
      }
    }

    // Workspace enforcement keys: read from workspacePermissionDefaults if available
    // but getPolicies() only has access to settings.permissions, so use defaults
    // for ws keys. This is why getPolicies() is deprecated — it can't read both paths.

    return flat;
  }

  private deepCopy<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }
}
