import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

type Role = { id: string; name: string; permissions: string[] };

export default function RolesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin','roles'],
    queryFn: async () => (await apiClient.get('/admin/roles')).data as Role[],
  });

  if (isLoading) return <div>Loading roles…</div>;
  if (error) return <div className="text-red-600">{fmt(error)}</div>;
  const roles = data ?? [];

  return (
    <div>
      <h1 className="text-xl font-semibold mb-3">Roles & Permissions</h1>
      <ul className="space-y-3">
        {roles.map(r => (
          <li key={r.id} className="border rounded p-3">
            <div className="font-medium">{r.name}</div>
            <div className="text-sm text-gray-600">Permissions: {r.permissions.join(', ') || '—'}</div>
          </li>
        ))}
        {!roles.length && <li className="text-gray-500">No roles defined.</li>}
      </ul>
    </div>
  );
}
function fmt(e: unknown){return e instanceof Error?e.message:typeof e==='string'?e:JSON.stringify(e)}
