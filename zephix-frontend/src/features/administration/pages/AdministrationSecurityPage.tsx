import { Tabs } from "@/components/ui/overlay/Tabs";
import { OrgPermissionsTab } from "../components/security/OrgPermissionsTab";
import { WorkspacePermissionsTab } from "../components/security/WorkspacePermissionsTab";
import { SecuritySettingsTab } from "../components/security/SecuritySettingsTab";

export default function AdministrationSecurityPage() {
  const tabItems = [
    { id: "org-permissions", label: "Org Permissions", content: <OrgPermissionsTab /> },
    { id: "workspace-permissions", label: "Workspace Permissions", content: <WorkspacePermissionsTab /> },
    { id: "security-settings", label: "Security Settings", content: <SecuritySettingsTab /> },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Security</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage role permissions, access policies, and security settings for your organization.
        </p>
      </div>
      <Tabs items={tabItems} defaultActiveTab="org-permissions" />
    </div>
  );
}
