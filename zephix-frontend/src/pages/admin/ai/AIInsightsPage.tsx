import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export default function AIInsightsPage() {
  const risksQ = useQuery({
    queryKey: ['admin','ai','insights','risks'],
    queryFn: async () => (await apiClient.get('/admin/ai/insights/risks')).data,
  });
  const resQ = useQuery({
    queryKey: ['admin','ai','insights','resources'],
    queryFn: async () => (await apiClient.get('/admin/ai/insights/resources')).data,
  });

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-xl font-semibold mb-2">Risk Insights</h1>
        {risksQ.isLoading ? 'Loading…' :
         risksQ.error ? <div role="alert">{String(risksQ.error)}</div> :
         <ul className="list-disc pl-5">
           {(risksQ.data?.data ?? []).map((r: any) => <li key={r.id}>{r.title} — {r.reason}</li>)}
           {!(risksQ.data?.data ?? []).length && <li className="opacity-70">No risk signals</li>}
         </ul>}
      </section>
      <section>
        <h2 className="text-lg font-medium mb-2">Resource Conflicts</h2>
        {resQ.isLoading ? 'Loading…' :
         resQ.error ? <div role="alert">{String(resQ.error)}</div> :
         <ul className="list-disc pl-5">
           {(resQ.data?.data ?? []).map((c: any) => <li key={c.id}>{c.resourceName}: {c.window}</li>)}
           {!(resQ.data?.data ?? []).length && <li className="opacity-70">No conflicts forecasted</li>}
         </ul>}
      </section>
    </div>
  );
}

