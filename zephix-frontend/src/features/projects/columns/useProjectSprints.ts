import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listSprints, type Sprint } from '@/features/sprints/sprints.api';

/**
 * Cached sprint list for a project — shared by all sprint column cells.
 */
export function useProjectSprints(projectId: string | null | undefined) {
  const query = useQuery({
    queryKey: ['project-sprints', projectId],
    queryFn: () => listSprints(projectId!),
    enabled: Boolean(projectId),
    staleTime: 60_000,
  });

  const sprintMap = useMemo(() => {
    const m = new Map<string, Sprint>();
    for (const s of query.data ?? []) {
      m.set(s.id, s);
    }
    return m;
  }, [query.data]);

  const activeSprints = useMemo(
    () => (query.data ?? []).filter((s) => s.status === 'ACTIVE'),
    [query.data],
  );
  const planningSprints = useMemo(
    () => (query.data ?? []).filter((s) => s.status === 'PLANNING'),
    [query.data],
  );
  const completedSprints = useMemo(
    () => (query.data ?? []).filter((s) => s.status === 'COMPLETED'),
    [query.data],
  );

  return {
    sprints: query.data ?? [],
    sprintMap,
    activeSprints,
    planningSprints,
    completedSprints,
    isLoading: query.isLoading,
    error: query.error,
  };
}
