import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

interface RiskInsight {
  id: string;
  title: string;
  reason: string;
}

interface ResourceConflict {
  id: string;
  resourceName: string;
  window: string;
}

export default function AIInsightsPage() {
  const risksQ = useQuery({
    queryKey: ['admin','ai','insights','risks'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: RiskInsight[] }>('/admin/ai/insights/risks');
      return response.data?.data ?? response.data ?? [];
    },
  });
  const resQ = useQuery({
    queryKey: ['admin','ai','insights','resources'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: ResourceConflict[] }>('/admin/ai/insights/resources');
      return response.data?.data ?? response.data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-xl font-semibold mb-2">Risk Insights</h1>
        {risksQ.isLoading ? 'Loading…' :
         risksQ.error ? <div role="alert">{String(risksQ.error)}</div> :
         <ul className="list-disc pl-5">
           {(risksQ.data ?? []).map((r) => <li key={r.id}>{r.title} — {r.reason}</li>)}
           {!(risksQ.data ?? []).length && <li className="opacity-70">No risk signals</li>}
         </ul>}
      </section>
      <section>
        <h2 className="text-lg font-medium mb-2">Resource Conflicts</h2>
        {resQ.isLoading ? 'Loading…' :
         resQ.error ? <div role="alert">{String(resQ.error)}</div> :
         <ul className="list-disc pl-5">
           {(resQ.data ?? []).map((c) => <li key={c.id}>{c.resourceName}: {c.window}</li>)}
           {!(resQ.data ?? []).length && <li className="opacity-70">No conflicts forecasted</li>}
         </ul>}
      </section>
    </div>
  );
}

