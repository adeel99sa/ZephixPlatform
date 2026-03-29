import { useMutation, useQueryClient } from '@tanstack/react-query';

import type {
  ExecuteGateDecisionPayload,
  ExecuteGateDecisionResult,
} from '../types/gate-decision.types';
import { executeGateDecision } from '../api/gate-decision.api';

import { projectKeys } from '@/features/projects/hooks';

type MutationInput = {
  projectId: string;
  gateDefinitionId: string;
  payload: ExecuteGateDecisionPayload;
};

/**
 * Prompt 5b: Run a PMBOK-style gate decision (GO / NO_GO / CONDITIONAL_GO / …).
 * Invalidates project detail + lists; Prompts 7–8 can extend invalidation (phases/tasks).
 */
export function useExecuteGateDecision() {
  const queryClient = useQueryClient();

  return useMutation<ExecuteGateDecisionResult, Error, MutationInput>({
    mutationFn: ({ projectId, gateDefinitionId, payload }) =>
      executeGateDecision(projectId, gateDefinitionId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: projectKeys.detail(variables.projectId),
      });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}
