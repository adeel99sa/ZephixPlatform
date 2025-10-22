import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export default function AIJobsPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['admin','ai','jobs'],
    queryFn: async () => (await apiClient.get('/admin/ai/jobs?state=active')).data,
  });

  const retry = useMutation({
    mutationFn: async (id: string) => (await apiClient.post(`/admin/ai/jobs/${id}/retry`, {})).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin','ai','jobs'] }),
  });

  if (q.isLoading) return <div>Loading jobs…</div>;
  if (q.error) return <div role="alert">{String(q.error)}</div>;
  const jobs = q.data?.data ?? [];
  return (
    <div>
      <h1 className="text-xl font-semibold mb-3">AI Jobs</h1>
      <table className="w-full text-sm">
        <thead><tr><th>ID</th><th>Queue</th><th>State</th><th>Attempts</th><th></th></tr></thead>
        <tbody>
          {jobs.map((j: any) => (
            <tr key={j.id} className="border-t">
              <td className="py-2">{j.id}</td>
              <td>{j.queue}</td>
              <td>{j.state}</td>
              <td>{j.attemptsMade}/{j.attempts}</td>
              <td>
                {j.state === 'failed' && (
                  <button className="px-2 py-1 border rounded" onClick={() => retry.mutate(j.id)}>
                    Retry
                  </button>
                )}
              </td>
            </tr>
          ))}
          {!jobs.length && <tr><td colSpan={5} className="py-6 text-center opacity-70">No jobs</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

