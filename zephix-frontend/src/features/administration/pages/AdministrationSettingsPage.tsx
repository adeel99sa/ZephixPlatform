/**
 * AdministrationSettingsPage — MVP-4: 3-tab settings page.
 * Replaces the placeholder 4-card skeleton.
 *
 * Tab 1: Organization Profile (name, industry, size, website, description)
 * Tab 2: Security (2FA, session, password policy, lockout, IP whitelist)
 * Tab 3: Permissions (7 org-level policy toggles by role tier)
 */
import { Tabs } from "@/components/ui/overlay/Tabs";
import { OrgProfileTab } from "../components/settings/OrgProfileTab";
import { SecurityTab } from "../components/settings/SecurityTab";
import { PermissionsTab } from "../components/settings/PermissionsTab";

export default function AdministrationSettingsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage your organization's profile, security, and permission policies.
        </p>
      </header>

      <Tabs
        items={[
          { id: "profile", label: "Organization", content: <OrgProfileTab /> },
          { id: "security", label: "Security", content: <SecurityTab /> },
          { id: "permissions", label: "Permissions", content: <PermissionsTab /> },
        ]}
        defaultActiveTab="profile"
      />
    </div>
  );
}
