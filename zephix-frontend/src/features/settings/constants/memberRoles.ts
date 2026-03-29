/**
 * Workspace member roles for Admin Console (UI). Backend remains source of truth.
 * Internal key for governance alignment: GOVERNANCE_ADMIN → `governance_admin`.
 */
export type WorkspaceMemberRole =
  | "workspace_owner"
  | "admin"
  | "governance_admin"
  | "project_manager"
  | "member"
  | "read_only";

/** API / persistence key alias (documented for backend alignment). */
export const ROLE_KEY_GOVERNANCE_ADMIN = "governance_admin" as const;

export const WORKSPACE_MEMBER_ROLE_LABELS: Record<WorkspaceMemberRole, string> = {
  workspace_owner: "Workspace Owner",
  admin: "Admin",
  governance_admin: "Governance Admin",
  project_manager: "Project Manager",
  member: "Member",
  read_only: "Read-Only",
};

/** Full list including Owner (for display when row is owner; Owner is not assignable via dropdown). */
export const WORKSPACE_MEMBER_ROLE_ORDER: WorkspaceMemberRole[] = [
  "workspace_owner",
  "admin",
  "governance_admin",
  "project_manager",
  "member",
  "read_only",
];

/** Roles that may be assigned via the members table dropdown (excludes Owner). */
export const ASSIGNABLE_MEMBER_ROLES: WorkspaceMemberRole[] = [
  "admin",
  "governance_admin",
  "project_manager",
  "member",
  "read_only",
];

export function isGovernanceRole(role: WorkspaceMemberRole): boolean {
  return role === "governance_admin";
}

/** Shared `<select>` styling for settings data tables (Members, etc.). */
export const SETTINGS_TABLE_SELECT_CLASS =
  "h-9 min-w-[220px] max-w-[260px] rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-600";

/** Short blurbs for the invite flow (UI copy only). */
export const INVITE_ROLE_DESCRIPTIONS: Record<WorkspaceMemberRole, string> = {
  workspace_owner:
    "Full control of the workspace, billing, and member management. Assign sparingly.",
  admin:
    "Configure workspace settings, integrations, and most governance surfaces except org-wide policy overrides.",
  governance_admin:
    "Owns phase gates, template governance alignment, and capacity policy within the workspace.",
  project_manager:
    "Creates and runs projects, assigns work, and collaborates with members; limited governance edits.",
  member:
    "Members can execute tasks and view dashboards, but cannot modify governance rules.",
  read_only:
    "View-only access to permitted projects and dashboards; cannot change work items.",
};
