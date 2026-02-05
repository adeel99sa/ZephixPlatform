import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { isJustificationRequiredError } from '../utils/allocation-errors';
import type { ResourceJustificationModalProps } from '../components/ResourceJustificationModal';

export interface CreateAllocationPayload {
  resourceId: string;
  projectId: string;
  taskId?: string;
  allocationPercentage: number;
  hoursPerWeek?: number;
  startDate: string;
  endDate: string;
  type?: 'HARD' | 'SOFT' | 'GHOST';
  bookingSource?: 'MANUAL' | 'JIRA' | 'GITHUB' | 'AI';
  justification?: string;
}

export interface UpdateAllocationPayload {
  id: string;
  allocationPercentage?: number;
  hoursPerWeek?: number;
  startDate?: string;
  endDate?: string;
  type?: 'HARD' | 'SOFT' | 'GHOST';
  bookingSource?: 'MANUAL' | 'JIRA' | 'GITHUB' | 'AI';
  justification?: string;
}

export interface UseGovernedAllocationMutationOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  resourceName?: string;
  invalidateQueries?: string[];
}

export interface UseGovernedAllocationMutationResult {
  // Mutation functions
  createAllocation: (payload: CreateAllocationPayload) => Promise<void>;
  updateAllocation: (payload: UpdateAllocationPayload) => Promise<void>;

  // Modal state
  isJustificationModalOpen: boolean;
  justificationModalProps: Omit<ResourceJustificationModalProps, 'onSubmit' | 'onCancel'>;

  // Handlers
  handleJustificationSubmit: (justification: string) => Promise<void>;
  handleJustificationCancel: () => void;

  // Mutation state
  isLoading: boolean;
  error: any;
}

/**
 * Hook that wraps allocation mutations with justification handling
 *
 * When an allocation fails with "justification required", this hook:
 * 1. Stores the pending payload
 * 2. Opens the justification modal
 * 3. Retries the mutation when user submits justification
 */
export function useGovernedAllocationMutation(
  options: UseGovernedAllocationMutationOptions = {},
): UseGovernedAllocationMutationResult {
  const queryClient = useQueryClient();
  const [isJustificationModalOpen, setIsJustificationModalOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<CreateAllocationPayload | UpdateAllocationPayload | null>(null);
  const [pendingAction, setPendingAction] = useState<'create' | 'update' | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // Create allocation mutation
  const createMutation = useMutation({
    mutationFn: async (payload: CreateAllocationPayload) => {
      const response = await apiClient.post<{ data: unknown }>('/resources/allocations', payload);
      return response.data ?? response;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['resource-timeline'] });
      queryClient.invalidateQueries({ queryKey: ['resource-heatmap'] });
      queryClient.invalidateQueries({ queryKey: ['resource-allocs'] });

      // Custom invalidations
      if (options.invalidateQueries) {
        options.invalidateQueries.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: [key] });
        });
      }

      options.onSuccess?.(data);
    },
  });

  // Update allocation mutation
  const updateMutation = useMutation({
    mutationFn: async (payload: UpdateAllocationPayload) => {
      const { id, ...updateData } = payload;
      const response = await apiClient.patch<{ data: unknown }>(`/resources/allocations/${id}`, updateData);
      return response.data ?? response;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['resource-timeline'] });
      queryClient.invalidateQueries({ queryKey: ['resource-heatmap'] });
      queryClient.invalidateQueries({ queryKey: ['resource-allocs'] });

      // Custom invalidations
      if (options.invalidateQueries) {
        options.invalidateQueries.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: [key] });
        });
      }

      options.onSuccess?.(data);
    },
  });

  // Handle create allocation with justification flow
  const createAllocation = useCallback(
    async (payload: CreateAllocationPayload) => {
      try {
        await createMutation.mutateAsync(payload);
      } catch (error: any) {
        if (isJustificationRequiredError(error)) {
          // Store payload and open modal
          setPendingPayload(payload);
          setPendingAction('create');
          setIsJustificationModalOpen(true);
          setModalError(null);
          // Don't call onError for justification required - we handle it via modal
          return;
        }
        // For other errors, call onError
        options.onError?.(error);
        throw error;
      }
    },
    [createMutation, options],
  );

  // Handle update allocation with justification flow
  const updateAllocation = useCallback(
    async (payload: UpdateAllocationPayload) => {
      try {
        await updateMutation.mutateAsync(payload);
      } catch (error: any) {
        if (isJustificationRequiredError(error)) {
          // Store payload and open modal
          setPendingPayload(payload);
          setPendingAction('update');
          setIsJustificationModalOpen(true);
          setModalError(null);
          // Don't call onError for justification required - we handle it via modal
          return;
        }
        // For other errors, call onError
        options.onError?.(error);
        throw error;
      }
    },
    [updateMutation, options],
  );

  // Handle justification submission
  const handleJustificationSubmit = useCallback(
    async (justification: string) => {
      if (!pendingPayload || !pendingAction) return;

      setModalError(null);

      try {
        const payloadWithJustification = {
          ...pendingPayload,
          justification,
        };

        if (pendingAction === 'create') {
          await createMutation.mutateAsync(payloadWithJustification as CreateAllocationPayload);
        } else {
          await updateMutation.mutateAsync(payloadWithJustification as UpdateAllocationPayload);
        }

        // Success - close modal and clear state
        setIsJustificationModalOpen(false);
        setPendingPayload(null);
        setPendingAction(null);
        setModalError(null);
      } catch (error: any) {
        // If it's another justification error, stay in modal
        if (isJustificationRequiredError(error)) {
          setModalError('Justification is still required. Please provide a valid reason.');
        } else {
          // Other error - close modal and show standard error
          setIsJustificationModalOpen(false);
          setPendingPayload(null);
          setPendingAction(null);
          options.onError?.(error);
        }
      }
    },
    [pendingPayload, pendingAction, createMutation, updateMutation, options],
  );

  // Handle modal cancel
  const handleJustificationCancel = useCallback(() => {
    setIsJustificationModalOpen(false);
    setPendingPayload(null);
    setPendingAction(null);
    setModalError(null);
  }, []);

  // Build modal props
  const dateRange =
    pendingPayload && pendingPayload.startDate && pendingPayload.endDate
      ? { startDate: pendingPayload.startDate, endDate: pendingPayload.endDate }
      : undefined;

  const justificationModalProps: Omit<ResourceJustificationModalProps, 'onSubmit' | 'onCancel'> = {
    open: isJustificationModalOpen,
    resourceName: options.resourceName,
    dateRange,
    isLoading: createMutation.isPending || updateMutation.isPending,
    error: modalError,
  };

  return {
    createAllocation,
    updateAllocation,
    isJustificationModalOpen,
    justificationModalProps,
    handleJustificationSubmit,
    handleJustificationCancel,
    isLoading: createMutation.isPending || updateMutation.isPending,
    error: createMutation.error || updateMutation.error,
  };
}






