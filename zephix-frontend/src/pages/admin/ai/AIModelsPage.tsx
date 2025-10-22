import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export default function AIModelsPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['admin','ai','models'],
    queryFn: async () => (await apiClient.get('/admin/ai/models')).data,
  });
  const update = useMutation({
    mutationFn: async (payload: any) => (await apiClient.patch('/admin/ai/models', payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin','ai','models'] }),
  });
  if (q.isLoading) return <div>Loading models…</div>;
  if (q.error) return <div role="alert">{String(q.error)}</div>;
  const models = q.data?.data ?? [];
  return (
    <div>
      <h1 className="text-xl font-semibold mb-3">AI Models</h1>
      {models.map((m: any) => (
        <div key={m.id} className="border rounded p-3 mb-2">
          <div className="font-medium">{m.name}</div>
          <div className="text-sm">Pipeline: {m.pipeline}</div>
          <button className="mt-2 px-2 py-1 border rounded"
            onClick={() => update.mutate({ id: m.id, active: !m.active })}>
            {m.active ? 'Disable' : 'Activate'}
          </button>
        </div>
      ))}
      {!models.length && <div className="opacity-70">No model configs</div>}
    </div>
  );
}

