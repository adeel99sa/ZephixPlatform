import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

type KPI = { id: string; key: string; name: string; type: 'provided' | 'derived'; formula?: string };

export default function KpisPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin','kpis'],
    queryFn: async () => (await apiClient.get('/admin/kpis')).data as KPI[],
  });

  if (isLoading) return <div>Loading KPIs…</div>;
  if (error) return <div className="text-red-600">{fmt(error)}</div>;
  const items = data ?? [];

  return (
    <div>
      <h1 className="text-xl font-semibold mb-3">KPI Catalog</h1>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-left p-2 border-b">Key</th>
            <th className="text-left p-2 border-b">Name</th>
            <th className="text-left p-2 border-b">Type</th>
            <th className="text-left p-2 border-b">Formula</th>
          </tr>
        </thead>
        <tbody>
          {items.map(k => (
            <tr key={k.id} className="border-b">
              <td className="p-2">{k.key}</td>
              <td className="p-2">{k.name}</td>
              <td className="p-2">{k.type}</td>
              <td className="p-2"><code className="text-xs">{k.formula ?? '—'}</code></td>
            </tr>
          ))}
          {!items.length && (
            <tr><td colSpan={4} className="p-4 text-center text-gray-500">No KPIs defined.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
function fmt(e: unknown){return e instanceof Error?e.message:typeof e==='string'?e:JSON.stringify(e)}
