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

  return response.data;
}

/**
 * Get template preview for v5_1
 */
export async function getPreview(
  templateId: string
): Promise<PreviewResponse> {
  const { activeWorkspaceId } = useWorkspaceStore.getState();

  if (!activeWorkspaceId) {
    throw new Error('WORKSPACE_REQUIRED');
  }

  const response = await apiClient.get<{ data: PreviewResponse }>(
    `/templates/${templateId}/preview-v5_1`,
    {
      headers: {
        'x-workspace-id': activeWorkspaceId,
      },
    }
  );

  return response.data;
}

/**
 * Instantiate template v5_1
 */
export async function instantiateV51(
  templateId: string,
  projectName: string
): Promise<InstantiateV51Response> {
  const { activeWorkspaceId } = useWorkspaceStore.getState();

  if (!activeWorkspaceId) {
    throw new Error('WORKSPACE_REQUIRED');
  }

  const response = await apiClient.post<{ data: InstantiateV51Response }>(
    `/templates/${templateId}/instantiate-v5_1`,
    {
      projectName,
    },
    {
      headers: {
        'x-workspace-id': activeWorkspaceId,
      },
    }
  );

  return response.data;
}

// Legacy exports for backward compatibility
export const listTemplates = async (params?: { type?: string; category?: string }): Promise<any[]> => {
  const response = await apiClient.get('/templates', { params });
  return response.data || [];
};

export const applyTemplate = async (type: string, payload: any): Promise<any> => {
  const response = await apiClient.post(`/templates/${type}/apply`, payload);
  return response.data;
};
