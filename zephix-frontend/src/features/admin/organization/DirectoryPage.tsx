import { useNavigate } from 'react-router-dom';
import { Users, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';

export default function DirectoryPage() {
  const navigate = useNavigate();

  return (
    <div className="p-6" data-testid="admin-directory-root">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Directory</h1>
        <p className="text-gray-600 mt-2">
          Manage users and groups in your organization.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <Users className="h-6 w-6 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Users</h2>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            View and manage all users in your organization. Add, edit, or remove users and assign roles.
          </p>
          <Button
            onClick={() => navigate('/admin/users')}
            className="w-full"
          >
            Manage Users
          </Button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <UserCog className="h-6 w-6 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Groups</h2>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Organize users into groups for easier management and permission assignment.
          </p>
          <Button
            onClick={() => navigate('/admin/groups')}
            className="w-full"
          >
            Manage Groups
          </Button>
        </div>
      </div>
    </div>
  );
}

















