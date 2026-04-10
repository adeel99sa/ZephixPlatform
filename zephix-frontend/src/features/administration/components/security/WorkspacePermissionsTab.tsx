import { useState, useEffect } from "react";
import { Shield, Users, Eye, Lock } from "lucide-react";
import { request } from "@/lib/api";

/* ── Workspace permission category definitions ───────────────── */

type PermissionDef = {
  key: string;
  label: string;
  ownerOnly?: boolean;
};

type PermissionCategory = {
  id: string;
  label: string;
  permissions: PermissionDef[];
};

const WS_PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    id: "workspace-management",
    label: "Workspace Management",
    permissions: [
      { key: "editWorkspaceSettings", label: "Edit workspace settings", ownerOnly: true },
      { key: "deleteWorkspace", label: "Delete/archive workspace", ownerOnly: true },
      { key: "manageWorkspaceMembers", label: "Manage workspace members", ownerOnly: true },
      { key: "customizePermissions", label: "Customize workspace permissions", ownerOnly: true },
      { key: "customizeDashboard", label: "Customize workspace dashboard" },
      { key: "reorderSidebarContent", label: "Reorder sidebar content" },
    ],
  },
  {
    id: "workspace-projects",
    label: "Projects",
    permissions: [
      { key: "wsCreateProjects", label: "Create projects from templates" },
      { key: "wsDeleteProjects", label: "Delete/archive projects" },
      { key: "wsAssignPM", label: "Assign project manager" },
      { key: "wsManageProjectTeam", label: "Manage project team members" },
    ],
  },
  {
    id: "workspace-tasks",
    label: "Tasks",
    permissions: [
      { key: "wsCreateTasks", label: "Create tasks" },
      { key: "wsEditAnyTask", label: "Edit any task" },
      { key: "wsDeleteOwnTasks", label: "Delete own tasks" },
      { key: "wsDeleteOthersTasks", label: "Delete others' tasks" },
      { key: "wsChangeTaskStatus", label: "Change task status" },
      { key: "wsAssignTasks", label: "Assign tasks to members" },
    ],
  },
  {
    id: "workspace-views",
    label: "Views & Dashboards",
    permissions: [
      { key: "wsCreateViews", label: "Create views" },
      { key: "wsDeleteOwnViews", label: "Delete own views" },
      { key: "wsDeleteOthersViews", label: "Delete others' views" },
      { key: "wsCreateDashboards", label: "Create dashboards" },
    ],
  },
  {
    id: "workspace-communication",
    label: "Communication",
    permissions: [
      { key: "wsCommentOnTasks", label: "Comment on tasks" },
      { key: "wsUploadFiles", label: "Upload files" },
      { key: "wsDeleteFiles", label: "Delete files" },
      { key: "wsDeleteOthersComments", label: "Delete others' comments" },
    ],
  },
];

/* ── All keys ────────────────────────────────────────────────── */

const ALL_WS_KEYS = WS_PERMISSION_CATEGORIES.flatMap((c) => c.permissions.map((p) => p.key));

type RolePerms = Record<string, boolean>;

const WS_DEFAULT_PERMS: Record<string, RolePerms> = {
  owner: Object.fromEntries(ALL_WS_KEYS.map((k) => [k, true])),
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

/* ── Role meta ───────────────────────────────────────────────── */

type WsRole = "owner" | "member" | "viewer";

const WS_ROLES: Array<{ id: WsRole; label: string; icon: typeof Shield; description: string }> = [
  { id: "owner", label: "Owner", icon: Shield, description: "Full workspace control (non-editable)" },
  { id: "member", label: "Member", icon: Users, description: "Operational workspace access" },
  { id: "viewer", label: "Viewer", icon: Eye, description: "Read-only workspace access" },
];

/* ── Component ───────────────────────────────────────────────── */

export function WorkspacePermissionsTab() {
  const [selectedRole, setSelectedRole] = useState<WsRole>("owner");
  const [permissions, setPermissions] = useState<Record<string, RolePerms>>(WS_DEFAULT_PERMS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await request.get<any>("/admin/organization/workspace-permissions");
        if (!active) return;
        const stored = res?.data ?? res ?? {};
        setPermissions({
          owner: WS_DEFAULT_PERMS.owner,
          member: { ...WS_DEFAULT_PERMS.member, ...(stored.member || {}) },
          viewer: { ...WS_DEFAULT_PERMS.viewer, ...(stored.viewer || {}) },
        });
      } catch {
        if (active) setPermissions(WS_DEFAULT_PERMS);
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const togglePermission = (key: string) => {
    if (selectedRole === "owner") return;
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
      await request.patch("/admin/organization/workspace-permissions", {
        member: permissions.member,
        viewer: permissions.viewer,
      });
      setDirty(false);
      setSaveMsg({ type: "success", text: "Workspace permissions saved." });
    } catch {
      setSaveMsg({ type: "error", text: "Failed to save. The backend endpoint may not be available yet." });
    } finally {
      setIsSaving(false);
    }
  };

  const rolePerms = permissions[selectedRole] ?? {};

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Configure org-wide defaults for workspace roles. These become the ceiling that workspace-level customization cannot exceed.
      </p>
      <div className="flex gap-6">
        {/* Left panel — Role selector */}
        <div className="w-52 shrink-0 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Workspace Role</p>
          {WS_ROLES.map((role) => {
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
                {role.id === "owner" && (
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
            <div className="py-8 text-center text-sm text-gray-500">Loading workspace permissions...</div>
          ) : (
            <div className="space-y-6">
              {WS_PERMISSION_CATEGORIES.map((category) => (
                <div key={category.id}>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">{category.label}</h3>
                  <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
                    {category.permissions.map((perm) => {
                      const checked = rolePerms[perm.key] ?? false;
                      const isOwner = selectedRole === "owner";
                      const isOwnerOnly = perm.ownerOnly && selectedRole !== "owner";
                      const disabled = isOwner || isOwnerOnly;

                      return (
                        <label
                          key={perm.key}
                          className={`flex items-center justify-between px-4 py-2.5 ${
                            disabled ? "cursor-default opacity-60" : "cursor-pointer hover:bg-gray-50"
                          }`}
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
                          {isOwnerOnly && (
                            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Owner only</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}

              {selectedRole !== "owner" && (
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
    </div>
  );
}
