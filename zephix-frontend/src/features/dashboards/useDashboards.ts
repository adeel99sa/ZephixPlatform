import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export type DashboardSummary = { id: string; name: string; workspaceId: string; updatedAt?: string };

export function useDashboards(workspaceId?: string) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<DashboardSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/api/dashboards', { params: { workspaceId } });
        const list = res.data?.data?.items ?? res.data?.data ?? [];
        if (mounted) setItems(list);
      } catch (err) {
        if (mounted) {
          const message = err instanceof Error ? err.message : 'Failed to load dashboards';
          setError(message);
          setItems([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => { mounted = false; };
  }, [workspaceId, reloadKey]);

  return {
    loading,
    items,
    error,
    retry: () => setReloadKey((prev) => prev + 1),
  };
}
