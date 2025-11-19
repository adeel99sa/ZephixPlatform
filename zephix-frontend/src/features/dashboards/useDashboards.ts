import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export type DashboardSummary = { id: string; name: string; workspaceId: string; updatedAt?: string };

export function useDashboards(workspaceId?: string) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<DashboardSummary[]>([]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/dashboards', { params: { workspaceId } });
        const list = res.data?.data?.items ?? res.data?.data ?? [];
        if (mounted) setItems(list);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => { mounted = false; };
  }, [workspaceId]);

  return { loading, items };
}
