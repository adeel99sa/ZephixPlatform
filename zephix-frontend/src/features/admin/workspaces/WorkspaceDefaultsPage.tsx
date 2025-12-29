import { Sliders } from 'lucide-react';

export default function WorkspaceDefaultsPage() {
  return (
    <div className="p-6" data-testid="admin-workspace-defaults-root">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Sliders className="h-6 w-6" />
          Workspace Defaults
        </h1>
        <p className="text-gray-600 mt-2">
          Understand how workspace roles and permissions work across your organization.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-3xl space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Workspace Roles</h2>
          <p className="text-gray-600 text-sm mb-4">
            Each workspace has its own role hierarchy, independent of organization roles:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-600 ml-4">
            <li><strong>Owner:</strong> Full control over the workspace, including deletion and ownership transfer</li>
            <li><strong>Admin:</strong> Can manage members, permissions, and workspace settings</li>
            <li><strong>Member:</strong> Can create projects and participate in workspace activities</li>
            <li><strong>Viewer:</strong> Read-only access to workspace content</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Permission Matrix</h2>
          <p className="text-gray-600 text-sm mb-4">
            Each workspace can customize its permission matrix to control what each role can do:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-600 ml-4">
            <li>View workspace</li>
            <li>Edit workspace metadata</li>
            <li>Manage members</li>
            <li>Change member roles</li>
            <li>Create projects in workspace</li>
            <li>Archive or delete workspace</li>
          </ul>
          <p className="text-sm text-gray-500 mt-4">
            Organization owners and admins always have workspace owner-level permissions.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Default Methodology</h2>
          <p className="text-gray-600 text-sm">
            Each workspace can set a default methodology (Agile, Waterfall, Kanban, etc.) that applies to new projects created in that workspace.
            This can be overridden per project or template.
          </p>
        </section>

        <div className="mt-6 p-4 bg-blue-50 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> To configure workspace defaults for new workspaces, go to individual workspace settings.
            Organization-wide workspace defaults will be available in a future update.
          </p>
        </div>
      </div>
    </div>
  );
}

















