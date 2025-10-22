import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

type Key = { id: string; name: string; createdAt: string; lastUsedAt?: string };

export default function ApiKeysPage() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['admin','api-keys'],
    queryFn: async () => (await apiClient.get('/admin/api-keys')).data as Key[],
  });

  const createKey = useMutation({
    mutationFn: async () => (await apiClient.post('/admin/api-keys', {})).data as { token: string },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin','api-keys'] }),
  });

  if (list.isLoading) return <div>Loading API keys…</div>;
  if (list.error) return <div className="text-red-600">{fmt(list.error)}</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">API Keys</h1>
      <button className="px-4 py-2 rounded bg-black text-white" onClick={() => createKey.mutate()}>
        + Create Key
      </button>

      {createKey.data && (
        <div className="border rounded p-3 bg-yellow-50">
          <div className="font-medium">New token (copy now):</div>
          <code className="break-all">{createKey.data.token}</code>
        </div>
      )}

      <table className="w-full border">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-left p-2 border-b">Name</th>
            <th className="text-left p-2 border-b">Created</th>
            <th className="text-left p-2 border-b">Last Used</th>
          </tr>
        </thead>
        <tbody>
          {(list.data ?? []).map(k => (
            <tr key={k.id} className="border-b">
              <td className="p-2">{k.name}</td>
              <td className="p-2">{new Date(k.createdAt).toLocaleString()}</td>
              <td className="p-2">{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : '—'}</td>
            </tr>
          ))}
          {!list.data?.length && (
            <tr><td colSpan={3} className="p-4 text-center text-gray-500">No keys yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
function fmt(e: unknown){return e instanceof Error?e.message:typeof e==='string'?e:JSON.stringify(e)}
