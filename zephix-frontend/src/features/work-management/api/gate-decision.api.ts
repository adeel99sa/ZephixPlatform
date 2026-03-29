import type {
  ExecuteGateDecisionPayload,
  ExecuteGateDecisionResult,
} from '../types/gate-decision.types';

import { request } from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api/endpoints';

/**
 * POST /api/projects/:projectId/gates/:gateDefinitionId/execute-decision
 * Requires `x-workspace-id` (set globally for `/projects/*` routes).
 */
export async function executeGateDecision(
  projectId: string,
  gateDefinitionId: string,
  payload: ExecuteGateDecisionPayload,
): Promise<ExecuteGateDecisionResult> {
  return request.post<ExecuteGateDecisionResult>(
    API_ENDPOINTS.PROJECTS.EXECUTE_GATE_DECISION(projectId, gateDefinitionId),
    payload,
  );
}
