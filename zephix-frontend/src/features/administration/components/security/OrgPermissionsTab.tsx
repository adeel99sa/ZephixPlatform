import { useState, useEffect } from "react";
import { Shield, Users, Eye, Lock } from "lucide-react";
import { request } from "@/lib/api";

/* ── Permission category definitions ─────────────────────────── */

type PermissionDef = {
  key: string;
  label: string;
  adminOnly?: boolean;
};

type PermissionCategory = {
  id: string;
  label: string;
  permissions: PermissionDef[];
};

const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    id: "administration",
    label: "Administration",
    permissions: [
      { key: "accessAdminConsole", label: "Access Admin Console", adminOnly: true },
      { key: "inviteNewPeople", label: "Invite new people to org", adminOnly: true },
      { key: "changePlatformRoles", label: "Change platform roles", adminOnly: true },
      { key: "createWorkspaces", label: "Create workspaces", adminOnly: true },
      { key: "deleteWorkspaces", label: "Delete/archive workspaces", adminOnly: true },
      { key: "manageBilling", label: "Manage billing", adminOnly: true },
      { key: "viewAuditTrail", label: "View audit trail", adminOnly: true },
      { key: "configureGovernance", label: "Configure governance policies", adminOnly: true },
    ],
  },
  {
    id: "projects",
    label: "Projects",
    permissions: [
      { key: "createProjects", label: "Create projects from templates" },
      { key: "deleteProjects", label: "Delete/archive projects" },
      { key: "assignProjectManager", label: "Assign project manager" },
      { key: "manageProjectTeam", label: "Manage project team" },
    ],
  },
  {
    id: "tasks",
    label: "Tasks",
    permissions: [
      { key: "createTasks", label: "Create tasks" },
      { key: "editAnyTask", label: "Edit any task" },
      { key: "deleteOwnTasks", label: "Delete own tasks" },
      { key: "deleteOthersTasks", label: "Delete others' tasks" },
      { key: "changeTaskStatus", label: "Change task status" },
      { key: "assignTasks", label: "Assign tasks to members" },
    ],
  },
  {
    id: "views",
    label: "Views & Dashboards",
    permissions: [
      { key: "createViews", label: "Create views" },
      { key: "createDashboards", label: "Create dashboards" },
      { key: "customizeWorkspaceDashboard", label: "Customize workspace dashboard" },
    ],
  },
  {
    id: "communication",
    label: "Communication",
    permissions: [
      { key: "commentOnTasks", label: "Comment on tasks" },
      { key: "uploadFiles", label: "Upload files and attachments" },
      { key: "deleteFiles", label: "Delete files and attachments" },
    ],
  },
];

/* ── All permission keys ─────────────────────────────────────── */

const ALL_KEYS = PERMISSION_CATEGORIES.flatMap((c) => c.permissions.map((p) => p.key));

type RolePerms = Record<string, boolean>;

const DEFAULT_PERMS: Record<string, RolePerms> = {
  admin: Object.fromEntries(ALL_KEYS.map((k) => [k, true])),
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

/* ── Role meta ───────────────────────────────────────────────── */

type OrgRole = "admin" | "member" | "viewer";

const ROLES: Array<{ id: OrgRole; label: string; icon: typeof Shield; description: string }> = [
  { id: "admin", label: "Admin", icon: Shield, description: "Full platform access (non-editable)" },
  { id: "member", label: "Member", icon: Users, description: "Standard operational access" },
  { id: "viewer", label: "Viewer", icon: Eye, description: "Read-only with limited actions" },
];

/* ── Component ───────────────────────────────────────────────── */

export function OrgPermissionsTab() {
  const [selectedRole, setSelectedRole] = useState<OrgRole>("admin");
  const [permissions, setPermissions] = useState<Record<string, RolePerms>>(DEFAULT_PERMS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await request.get<any>("/admin/organization/permissions");
        if (!active) return;
        const stored = res?.data ?? res ?? {};
        setPermissions({
          admin: DEFAULT_PERMS.admin,
          member: { ...DEFAULT_PERMS.member, ...(stored.member || {}) },
          viewer: { ...DEFAULT_PERMS.viewer, ...(stored.viewer || {}) },
        });
      } catch {
        // Use defaults — endpoint may not exist yet
        if (active) setPermissions(DEFAULT_PERMS);
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const togglePermission = (key: string) => {
    if (selectedRole === "admin") return; // Admin is non-editable
    setPermissions((prev) => ({
      ...prev,
      [selectedRole]: {
        ...prev[selectedRole],
        [key]: !prev[selectedRole][key],
      },
    }));
    setDirty(true);
    setSaveMsg(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMsg(null);
    try {
      await request.patch("/admin/organization/permissions", {
        member: permissions.member,
        viewer: permissions.viewer,
      });
      setDirty(false);
      setSaveMsg({ type: "success", text: "Permissions saved." });
    } catch {
      setSaveMsg({ type: "error", text: "Failed to save. The backend endpoint may not be available yet." });
    } finally {
      setIsSaving(false);
    }
  };

  const rolePerms = permissions[selectedRole] ?? {};

  return (
    <div className="flex gap-6 mt-2">
      {/* Left panel — Role selector */}
      <div className="w-52 shrink-0 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Platform Role</p>
        {ROLES.map((role) => {
          const RIcon = role.icon;
          const active = selectedRole === role.id;
          return (
            <button
              key={role.id}
              type="button"
              onClick={() => { setSelectedRole(role.id); setSaveMsg(null); }}
              className={`w-full rounded-lg px-3 py-2.5 text-left transition-all ${
                active
                  ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-sm"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center gap-2">
                <RIcon className={`h-4 w-4 ${active ? "text-white" : "text-gray-400"}`} />
                <div>
                  <p className={`text-sm font-semibold ${active ? "text-white" : "text-gray-900"}`}>{role.label}</p>
                  <p className={`text-[11px] ${active ? "text-white/80" : "text-gray-500"}`}>{role.description}</p>
                </div>
              </div>
              {role.id === "admin" && (
                <div className="mt-1 flex items-center gap-1">
                  <Lock className={`h-3 w-3 ${active ? "text-white/70" : "text-gray-400"}`} />
                  <span className={`text-[10px] ${active ? "text-white/70" : "text-gray-400"}`}>Non-editable</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Right panel — Permission checkboxes */}
      <div className="flex-1 min-w-0">
        {isLoading ? (
          <div className="py-8 text-center text-sm text-gray-500">Loading permissions...</div>
        ) : (
          <div className="space-y-6">
            {PERMISSION_CATEGORIES.map((category) => (
              <div key={category.id}>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">{category.label}</h3>
                <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
                  {category.permissions.map((perm) => {
                    const isAdmin = selectedRole === "admin";
                    const isAdminOnly = perm.adminOnly && selectedRole !== "admin";
                    const checked = isAdmin ? true : (rolePerms[perm.key] ?? false);
                    const disabled = isAdmin || isAdminOnly;

                    return (
                      <label
                        key={perm.key}
                        className={`flex items-center justify-between px-4 py-2.5 ${
                          disabled ? "cursor-default" : "cursor-pointer hover:bg-gray-50"
                        } ${isAdmin || isAdminOnly ? "opacity-50" : ""}`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => togglePermission(perm.key)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                          />
                          <span className="text-sm text-gray-700">{perm.label}</span>
                        </div>
                        {isAdminOnly && (
                          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Admin only</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Save bar */}
            {selectedRole !== "admin" && (
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || !dirty}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? "Saving..." : "Save changes"}
                </button>
                {saveMsg && (
                  <span className={`text-sm ${saveMsg.type === "success" ? "text-green-600" : "text-red-600"}`}>
                    {saveMsg.text}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
