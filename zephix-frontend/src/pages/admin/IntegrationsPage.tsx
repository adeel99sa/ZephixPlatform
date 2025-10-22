import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

type Integration = { id: string; name: string; status: 'connected' | 'disconnected' | 'error'; details?: string };

export default function IntegrationsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin','integrations'],
    queryFn: async () => (await apiClient.get('/admin/integrations')).data as Integration[],
  });

  if (isLoading) return <div>Loading integrations…</div>;
  if (error) return <div className="text-red-600">{fmt(error)}</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-3">Integrations</h1>
      <ul className="space-y-2">
        {(data ?? []).map(i => (
          <li key={i.id} className="border rounded p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{i.name}</div>
              <div className="text-sm text-gray-600">Status: {i.status}</div>
              {i.details && <div className="text-xs text-gray-500">{i.details}</div>}
            </div>
            <button className="px-3 py-1 rounded border">Configure</button>
          </li>
        ))}
        {!data?.length && <li className="text-gray-500">No integrations available.</li>}
      </ul>
    </div>
  );
}
function fmt(e: unknown){return e instanceof Error?e.message:typeof e==='string'?e:JSON.stringify(e)}
