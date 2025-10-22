import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

type Template = { id: string; name: string; category?: string; updatedAt: string };

export default function TemplatesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin','templates'],
    queryFn: async () => (await apiClient.get('/admin/templates')).data as Template[],
  });

  if (isLoading) return <div>Loading templates…</div>;
  if (error) return <div className="text-red-600">{fmt(error)}</div>;

  const items = data ?? [];
  return (
    <div>
      <h1 className="text-xl font-semibold mb-3">Templates Library</h1>
      <ul className="space-y-2">
        {items.map(t => (
          <li key={t.id} className="border rounded p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{t.name}</div>
              <div className="text-sm text-gray-600">{t.category ?? 'General'} • Updated {new Date(t.updatedAt).toLocaleDateString()}</div>
            </div>
            <button className="px-3 py-1 rounded border">Open</button>
          </li>
        ))}
        {!items.length && <li className="text-gray-500">No templates found.</li>}
      </ul>
    </div>
  );
}
function fmt(e: unknown){return e instanceof Error?e.message:typeof e==='string'?e:JSON.stringify(e)}
