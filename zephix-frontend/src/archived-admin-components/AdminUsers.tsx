import { useState, useEffect } from 'react';
import { adminApi } from '../../services/adminApi';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';

export function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
    adminApi.createAuditLog('admin.users.view', { page: 'users' });
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch(role) {
      case 'owner': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'pm': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">User Management</h1>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load users: {error}
            <button onClick={loadUsers} className="ml-4 underline">
              Try again
            </button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        <div className="text-sm text-gray-500">
          {users.length} total users
        </div>
      </div>

      <div className="bg-white rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4 font-medium text-gray-700">User</th>
                <th className="text-left p-4 font-medium text-gray-700">Organization</th>
                <th className="text-left p-4 font-medium text-gray-700">Role</th>
                <th className="text-left p-4 font-medium text-gray-700">Joined</th>
                <th className="text-left p-4 font-medium text-gray-700">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <div>
                      <div className="font-medium">
                        {user.firstName && user.lastName 
                          ? `${user.firstName} ${user.lastName}`
                          : 'No name'}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="p-4 text-gray-700">
                    {user.organization || 'No organization'}
                  </td>
                  <td className="p-4">
                    <Badge className={getRoleBadgeColor(user.role)}>
                      {user.role}
                    </Badge>
                  </td>
                  <td className="p-4 text-gray-700">
                    {new Date(user.joinedAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-gray-700">
                    {new Date(user.lastActive).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
