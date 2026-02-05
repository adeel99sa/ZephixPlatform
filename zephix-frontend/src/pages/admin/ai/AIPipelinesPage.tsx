import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

interface Pipeline {
  id: string;
  name: string;
  lastRunAt?: string;
  health?: string;
}

export default function AIPipelinesPage() {
  const q = useQuery({
    queryKey: ['admin','ai','pipelines'],
    queryFn: async () => apiClient.get<{ data: Pipeline[] }>('/admin/ai/pipelines'),
  });
  if (q.isLoading) return <div>Loading pipelines…</div>;
  if (q.error) return <div role="alert">{String(q.error)}</div>;
  const data = q.data as { data?: Pipeline[] } | undefined;
  const pipelines = data?.data ?? [];
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">AI Pipelines</h1>
      <div className="grid gap-3">
        {pipelines.map((p: any) => (
          <div key={p.id} className="rounded border p-3">
            <div className="font-medium">{p.name}</div>
            <div className="text-sm opacity-80">Last run: {p.lastRunAt ?? '—'}</div>
            <div className="text-sm">Health: {p.health ?? 'unknown'}</div>
          </div>
        ))}
        {!pipelines.length && (
          <div className="text-center py-8 text-gray-500">
            No AI pipelines configured yet.
          </div>
        )}
      </div>
    </div>
  );
}

