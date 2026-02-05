import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

interface DocRow {
  id: string;
  filename: string;
  status: string;
  lastJobId?: string;
}

export default function AIDocumentsPage() {
  const q = useQuery({
    queryKey: ['admin','ai','docs'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: DocRow[] }>('/admin/ai/docs?status=any');
      return response;
    },
  });
  if (q.isLoading) return <div>Loading documents…</div>;
  if (q.error) return <div role="alert">{String(q.error)}</div>;
  const data = q.data as { data?: DocRow[] } | undefined;
  const rows = data?.data ?? [];
  return (
    <div>
      <h1 className="text-xl font-semibold mb-3">AI Documents</h1>
      <ul className="space-y-2">
        {rows.map((d: any) => (
          <li key={d.id} className="border rounded p-3">
            <div className="font-medium">{d.filename}</div>
            <div className="text-sm">Status: {d.status}</div>
            <div className="text-sm opacity-80">Job: {d.lastJobId ?? '—'}</div>
          </li>
        ))}
        {!rows.length && <li className="opacity-70">No documents</li>}
      </ul>
    </div>
  );
}

