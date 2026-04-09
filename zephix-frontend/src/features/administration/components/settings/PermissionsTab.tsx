/**
 * PermissionsTab — MVP-4: Org-level permission policy toggles.
 * Stored in Organization.settings.permissions JSONB.
 * These are STORED but NOT yet ENFORCED by runtime guards.
 * Guard enforcement is a follow-up PR.
 */
import { useState, useEffect } from "react";
import { Loader2, Lock } from "lucide-react";
import { Switch } from "@/components/ui/form/Switch";
import { Button } from "@/components/ui/button/Button";
import { administrationApi, type OrgPermissions } from "../../api/administration.api";

const DEFAULTS: OrgPermissions = {
  wsOwnersCanManagePermissions: true,
  wsOwnersCanInviteMembers: true,
  wsOwnersCanCreateProjects: true,
  wsOwnersCanDeleteProjects: false,
  membersCanCreateTasks: true,
  membersCanDeleteOwnTasks: false,
  viewersCanComment: true,
};

type PermToggle = {
  key: keyof OrgPermissions;
  label: string;
  help: string;
  destructive?: boolean;
};

const SECTIONS: Array<{ title: string; toggles: PermToggle[] }> = [
  {
    title: "Workspace Owner Permissions",
    toggles: [
      {
        key: "wsOwnersCanManagePermissions",
        label: "Manage workspace permissions",
        help: "Allow workspace owners to customize permissions for their workspace members",
      },
      {
        key: "wsOwnersCanInviteMembers",
        label: "Invite members to workspace",
        help: "Allow workspace owners to add existing org members to their workspace",
      },
      {
        key: "wsOwnersCanCreateProjects",
        label: "Create projects",
        help: "Allow workspace owners to create new projects from templates",
      },
      {
        key: "wsOwnersCanDeleteProjects",
        label: "Delete projects",
        help: "Allow workspace owners to permanently delete projects (destructive action)",
        destructive: true,
      },
    ],
  },
  {
    title: "Member Permissions",
    toggles: [
      {
        key: "membersCanCreateTasks",
        label: "Create tasks",
        help: "Allow members to create new tasks in projects they're assigned to",
      },
      {
        key: "membersCanDeleteOwnTasks",
        label: "Delete own tasks",
        help: "Allow members to delete tasks they created",
        destructive: true,
      },
    ],
  },
  {
    title: "Viewer Permissions",
    toggles: [
      {
        key: "viewersCanComment",
        label: "Comment on tasks",
        help: "Allow viewers to add comments on tasks they can see",
      },
    ],
  },
];

export function PermissionsTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [perms, setPerms] = useState<OrgPermissions>(DEFAULTS);

  useEffect(() => {
    setIsLoading(true);
    administrationApi
      .getOrgPermissions()
      .then(setPerms)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  async function handleSave() {
    setIsSaving(true);
    setMsg(null);
    try {
      const updated = await administrationApi.updateOrgPermissions(perms);
      setPerms((p) => ({ ...p, ...updated }));
      setMsg({ type: "success", text: "Permission policies saved." });
      setTimeout(() => setMsg(null), 4000);
    } catch {
      setMsg({ type: "error", text: "Failed to save. Please try again." });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500">
          <Lock className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Permission Policies</h2>
          <p className="text-sm text-gray-500">
            Control what workspace owners and members can do across the organization
          </p>
        </div>
      </div>

      <div className="max-w-xl space-y-8">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">{section.title}</h3>
            <div className="space-y-4">
              {section.toggles.map((toggle) => (
                <div
                  key={toggle.key}
                  className={`rounded-lg border p-4 ${
                    toggle.destructive ? "border-amber-200 bg-amber-50/30" : "border-gray-100"
                  }`}
                >
                  <Switch
                    label={toggle.label}
                    help={toggle.help}
                    checked={perms[toggle.key]}
                    onChange={(e) => {
                      setPerms((p) => ({ ...p, [toggle.key]: e.target.checked }));
                      setMsg(null);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-4">
        <Button variant="primary" size="sm" onClick={handleSave} loading={isSaving}>
          Save changes
        </Button>
        {msg && (
          <span className={`text-sm ${msg.type === "success" ? "text-emerald-600" : "text-red-600"}`}>
            {msg.text}
          </span>
        )}
      </div>

      <p className="mt-4 text-xs text-gray-400">
        Note: These policies are stored but runtime enforcement by guards is being rolled out incrementally.
      </p>
    </div>
  );
}
