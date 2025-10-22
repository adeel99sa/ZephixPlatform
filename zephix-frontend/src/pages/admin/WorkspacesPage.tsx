import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

type Ws = { id: string; name: string; key: string; isDefault: boolean };

export default function WorkspacesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin','workspaces'],
    queryFn: async () => (await apiClient.get('/admin/workspaces')).data as Ws[],
  });

  if (isLoading) return <div>Loading workspaces…</div>;
  if (error) return <div className="text-red-600">{fmt(error)}</div>;
  const items = data ?? [];

  return (
    <div>
      <h1 className="text-xl font-semibold mb-3">Workspaces</h1>
      <ul className="space-y-2">
        {items.map(w => (
          <li key={w.id} className="border rounded p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{w.name}</div>
              <div className="text-sm text-gray-600">Key: {w.key} {w.isDefault && '(default)'}</div>
            </div>
            <a className="text-blue-600 hover:underline" href={`/hub?workspace=${w.id}`}>Open</a>
          </li>
        ))}
        {!items.length && <li className="text-gray-500">No workspaces found.</li>}
      </ul>
    </div>
  );
}
function fmt(e: unknown){return e instanceof Error?e.message:typeof e==='string'?e:JSON.stringify(e)}
