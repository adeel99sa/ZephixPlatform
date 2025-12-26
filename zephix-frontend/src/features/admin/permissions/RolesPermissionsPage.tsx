import { Shield } from 'lucide-react';

type Role = 'Owner' | 'Admin' | 'Member' | 'Viewer';
type Capability = string;

const roles: Role[] = ['Owner', 'Admin', 'Member', 'Viewer'];

const capabilities: Capability[] = [
  'Manage users',
  'Manage workspaces',
  'Create projects',
  'View templates',
  'Manage templates',
  'View analytics',
  'Manage billing',
];

// Static capability matrix - read-only for Phase 6
const capabilityMatrix: Record<Role, Capability[]> = {
  Owner: [
    'Manage users',
    'Manage workspaces',
    'Create projects',
    'View templates',
    'Manage templates',
    'View analytics',
    'Manage billing',
  ],
  Admin: [
    'Manage users',
    'Manage workspaces',
    'Create projects',
    'View templates',
    'Manage templates',
    'View analytics',
  ],
  Member: [
    'Create projects',
    'View templates',
    'View analytics',
  ],
  Viewer: [
    'View templates',
    'View analytics',
  ],
};

export default function RolesPermissionsPage() {
  return (
    <div className="p-6" data-testid="admin-roles-permissions-root">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Roles and Permissions
        </h1>
        <p className="text-gray-600 mt-2">
          View organization-wide roles and their capabilities. Role editing will be available in a future update.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            The following matrix shows the default capabilities for each organization role.
            Workspace-level permissions can be customized per workspace in Workspace Settings.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Capability
                </th>
                {roles.map((role) => (
                  <th
                    key={role}
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {role}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {capabilities.map((capability) => (
                <tr key={capability}>
                  <td className="px-4 py-3 text-sm text-gray-900">{capability}</td>
                  {roles.map((role) => {
                    const hasCapability = capabilityMatrix[role].includes(capability);
                    return (
                      <td key={role} className="px-4 py-3 text-center">
                        {hasCapability ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-800 text-xs">
                            ✓
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-400 text-xs">
                            —
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> This is a read-only view. Role editing and custom role creation will be available in a future update.
          </p>
        </div>
      </div>
    </div>
  );
}















