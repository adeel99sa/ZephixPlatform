/**
 * Risks Hooks – Custom React hooks for risk data fetching and mutations.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { listRisks, createRisk, generateTempRiskId } from './risks.api';
import type { Risk, CreateRiskInput, RiskSeverity, RiskStatus } from './types';
import { useWorkspaceStore } from '@/state/workspace.store';
import { telemetry } from '@/lib/telemetry';

interface UseRisksOptions {
  projectId: string | undefined;
  severity?: RiskSeverity;
  status?: RiskStatus;
}

interface UseRisksResult {
  risks: Risk[];
  loading: boolean;
  error: string | null;
  total: number;
  refetch: () => Promise<void>;
  createRiskOptimistic: (input: CreateRiskInput) => Promise<Risk | null>;
}

/**
 * Hook to fetch and manage risks for a project.
 * Does not fetch until workspace is valid and projectId exists.
 */
export function useRisks(options: UseRisksOptions): UseRisksResult {
  const { projectId, severity, status } = options;
  const { activeWorkspaceId } = useWorkspaceStore();

  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Track mounted state to avoid state updates after unmount
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchRisks = useCallback(async () => {
    // Don't fetch if workspace or projectId is missing
    if (!activeWorkspaceId || !projectId) {
      setRisks([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await listRisks({ projectId, severity, status });

      if (!mountedRef.current) return;

      setRisks(result.items);
      setTotal(result.total);

      // Telemetry: track list loaded
      telemetry.track('risks.list.loaded', {
        projectId,
        count: result.items.length,
      });
    } catch (e) {
      if (!mountedRef.current) return;

      const errorMessage = (e as Error).message || 'Failed to load risks';
      setError(errorMessage);
      setRisks([]);
      setTotal(0);

      // Don't toast on WORKSPACE_REQUIRED - this is expected during navigation
      const code = (e as { code?: string }).code;
      if (code !== 'WORKSPACE_REQUIRED') {
        toast.error('Failed to load risks');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [activeWorkspaceId, projectId, severity, status]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchRisks();
  }, [fetchRisks]);

  /**
   * Create a risk with optimistic update.
   * Returns the created risk on success, null on failure.
   */
  const createRiskOptimistic = useCallback(
    async (input: CreateRiskInput): Promise<Risk | null> => {
      if (!activeWorkspaceId || !projectId) {
        toast.error('Workspace required');
        return null;
      }

      // Create optimistic risk
      const tempId = generateTempRiskId();
      const optimisticRisk: Risk = {
        id: tempId,
        organizationId: '', // Will be set by server
        workspaceId: activeWorkspaceId,
        projectId,
        title: input.title,
        description: input.description || null,
        severity: input.severity || 'MEDIUM',
        status: input.status || 'OPEN',
        ownerUserId: input.ownerUserId || null,
        dueDate: input.dueDate || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };

      // Optimistically insert
      setRisks((prev) => [optimisticRisk, ...prev]);
      setTotal((prev) => prev + 1);

      try {
        const created = await createRisk(input);

        // Replace temp with real risk
        setRisks((prev) =>
          prev.map((r) => (r.id === tempId ? created : r))
        );

        telemetry.track('risks.create.success', { projectId, riskId: created.id });
        toast.success('Risk created');

        return created;
      } catch (e) {
        // Rollback optimistic insert
        setRisks((prev) => prev.filter((r) => r.id !== tempId));
        setTotal((prev) => Math.max(0, prev - 1));

        const code = (e as { code?: string }).code || 'UNKNOWN';
        telemetry.track('risks.create.error', { projectId, code });
        toast.error('Failed to create risk');

        return null;
      }
    },
    [activeWorkspaceId, projectId]
  );

  return {
    risks,
    loading,
    error,
    total,
    refetch: fetchRisks,
    createRiskOptimistic,
  };
}
