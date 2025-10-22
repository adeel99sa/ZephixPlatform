import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { getErrorText } from '@/lib/api/errors';

type AdminUser = { id: string; email: string; firstName?: string; lastName?: string; role: string; isActive: boolean };

export default function UsersPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin','users'],
    queryFn: async () => (await apiClient.get('/admin/users?limit=20')).data as { items: AdminUser[]; total: number },
  });

  if (isLoading) return <div>Loading users…</div>;
  if (error) return <div className="text-red-600">{getErrorText(error)}</div>;
  const items = data?.items ?? [];

  return (
    <div>
      <h1 className="text-xl font-semibold mb-3">Users</h1>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-left p-2 border-b">Name</th>
            <th className="text-left p-2 border-b">Email</th>
            <th className="text-left p-2 border-b">Role</th>
            <th className="text-left p-2 border-b">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map(u => (
            <tr key={u.id} className="border-b">
              <td className="p-2">{[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}</td>
              <td className="p-2">{u.email}</td>
              <td className="p-2">{u.role}</td>
              <td className="p-2">{u.isActive ? 'Active' : 'Disabled'}</td>
            </tr>
          ))}
          {!items.length && (
            <tr><td colSpan={4} className="p-4 text-center text-gray-500">No users found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
