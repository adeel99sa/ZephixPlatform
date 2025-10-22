import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

type Log = { id: string; at: string; actor: string; action: string; entityType: string; entityId: string; meta?: Record<string, unknown> };

export default function AuditLogsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin','audit-logs'],
    queryFn: async () => (await apiClient.get('/admin/audit-logs?limit=50')).data as Log[],
  });

  if (isLoading) return <div>Loading logs…</div>;
  if (error) return <div className="text-red-600">{fmt(error)}</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-3">Audit Logs</h1>
      <ul className="space-y-2">
        {(data ?? []).map(l => (
          <li key={l.id} className="border rounded p-3">
            <div className="text-sm text-gray-600">{new Date(l.at).toLocaleString()}</div>
            <div><b>{l.actor}</b> {l.action} <i>{l.entityType}</i> #{l.entityId}</div>
            {l.meta && <pre className="text-xs bg-gray-50 p-2 rounded mt-2 overflow-auto">{JSON.stringify(l.meta,null,2)}</pre>}
          </li>
        ))}
        {!data?.length && <li className="text-gray-500">No audit entries.</li>}
      </ul>
    </div>
  );
}
function fmt(e: unknown){return e instanceof Error?e.message:typeof e==='string'?e:JSON.stringify(e)}
