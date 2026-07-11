import { apiClient } from '@/lib/api/client';
import { useWorkspaceStore } from '@/state/workspace.store';

// Types matching backend response
export interface TemplateCard {
  templateId: string;
  templateName: string;
  containerType: 'PROJECT' | 'PROGRAM';
  workTypeTags: string[];
  scopeTags: string[];
  phaseCount: number;
  taskCount: number;
  lockSummary: string;
  setupTimeLabel: string;
  reasonCodes: string[];
  reasonLabels: string[];
}

export interface RecommendationResponse {
  recommended: TemplateCard[];
  others: TemplateCard[];
  inputsEcho: {
    containerType: 'PROJECT' | 'PROGRAM';
    workType: string;
    durationDays?: number;
    complexity?: string;
  };
  generatedAt: string;
}

export interface PreviewPhase {
  name: string;
  sortOrder: number;
  isMilestone: boolean;
  taskCount: number;
}

export interface PreviewResponse {
  templateId: string;
  templateName: string;
  phaseCount: number;
  taskCount: number;
  phases: PreviewPhase[];
  defaultTaskStatuses: string[];
  lockPolicy: {
    structureLocksOnStart: boolean;
    lockedItems: string[];
  };
  allowedBeforeStart: string[];
  allowedAfterStart: string[];
}

export interface InstantiateV51Response {
  projectId: string;
  projectName: string;
  state: 'DRAFT' | 'ACTIVE' | 'COMPLETED';
  structureLocked: boolean;
  phaseCount: number;
  taskCount: number;
}

/** TC-F2 — body fields accepted by live instantiate-v5_1 (name only today). */
export interface InstantiateV51Request {
  projectName: string;
  /** Collected in the flow; applied via PATCH /projects/:id after create. */
  description?: string;
  /** Collected in the flow; applied via PATCH /projects/:id after create. */
  startDate?: string;
  /**
   * Capability overrides (UpdateCapabilitiesDto vocabulary).
   * Applied via PATCH .../capabilities after create when provided.
   */
  capabilities?: {
    use_phases?: boolean;
    use_iterations?: boolean;
    use_gates?: boolean;
    use_wip_limits?: boolean;
  };
}

/**
 * Get template recommendations
 */
export async function getRecommendations(
  containerType: 'PROJECT' | 'PROGRAM',
  workType: string
): Promise<RecommendationResponse> {
  const { activeWorkspaceId } = useWorkspaceStore.getState();

  if (!activeWorkspaceId) {
    throw new Error('WORKSPACE_REQUIRED');
  }

  const response = await apiClient.get<{ data: RecommendationResponse }>(
    '/templates/recommendations',
    {
      params: {
        containerType,
        workType,
      },
      headers: {
        'x-workspace-id': activeWorkspaceId,
      },
    }
  );

  // Backend returns { data: RecommendationResponse }
  return response.data?.data ?? response.data as unknown as RecommendationResponse;
}

/**
 * Get template preview for v5_1
 *
 * Phase 5A.2 truth-closure fix:
 * `apiClient` (lib/api/client.ts) public methods already call
 * `unwrapOneDataLayer(response.data)` before returning, so the helper
 * receives the unwrapped payload directly. The previous code did a
 * second unwrap (`response.data?.data ?? response.data`) on a value
 * that was already the payload. `response.data` was undefined and the
 * function silently returned undefined cast to PreviewResponse — the
 * preview modal then had no data to render.
 */
export async function getPreview(
  templateId: string
): Promise<PreviewResponse> {
  const { activeWorkspaceId } = useWorkspaceStore.getState();

  if (!activeWorkspaceId) {
    throw new Error('WORKSPACE_REQUIRED');
  }

  const result = await apiClient.get<PreviewResponse>(
    `/templates/${templateId}/preview-v5_1`,
    {
      headers: {
        'x-workspace-id': activeWorkspaceId,
      },
    }
  );

  return result as PreviewResponse;
}

/**
 * Instantiate template v5_1
 *
 * Phase 5A.2 truth-closure fix:
 * Same bug class as `getPreview` above. `apiClient.post` already
 * unwraps one data layer, so `response.data?.data` was undefined and
 * the function silently returned undefined. The user clicked
 * "Use template", the backend created the project successfully, but
 * the frontend then tried to read `result.projectName` off undefined,
 * crashed into the catch branch, and showed a generic
 * "Failed to create project from template" error — even though the
 * project actually existed in the database.
 */
export async function instantiateV51(
  templateId: string,
  projectNameOrRequest: string | InstantiateV51Request,
): Promise<InstantiateV51Response> {
  const { activeWorkspaceId } = useWorkspaceStore.getState();

  if (!activeWorkspaceId) {
    throw new Error('WORKSPACE_REQUIRED');
  }

  const requestBody: InstantiateV51Request =
    typeof projectNameOrRequest === 'string'
      ? { projectName: projectNameOrRequest }
      : projectNameOrRequest;

  // Live InstantiateV51Dto accepts projectName (+ optional projectId only).
  // Dates/capabilities are applied by the Use Template flow after create.
  const result = await apiClient.post<InstantiateV51Response>(
    `/templates/${templateId}/instantiate-v5_1`,
    {
      projectName: requestBody.projectName,
    },
    {
      headers: {
        'x-workspace-id': activeWorkspaceId,
      },
    }
  );

  return result as InstantiateV51Response;
}

// Legacy exports for backward compatibility
export const listTemplates = async (params?: { type?: string; category?: string }): Promise<unknown[]> => {
  const response = await apiClient.get<{ data: unknown[] }>('/templates', { params });
  return response.data?.data ?? response.data ?? [];
};

export const applyTemplate = async (type: string, payload: any): Promise<any> => {
  const response = await apiClient.post(`/templates/${type}/apply`, payload);
  return response.data;
};
