import type {
  CanonicalTemplate,
  CreateProjectFromTemplateInput,
} from './types';

import { apiClient } from '@/lib/api/client';
import { unwrapArray, unwrapData } from '@/lib/api/unwrapData';

export interface TemplateCard {
  templateId: string;
  templateName: string;
  phaseCount: number;
  taskCount: number;
  reasonLabels: string[];
  lockSummary?: string;
}

export interface RecommendationResponse {
  recommended: TemplateCard[];
  others: TemplateCard[];
}

export interface PreviewResponse {
  templateId: string;
  templateName: string;
  phases: Array<{
    name: string;
    taskCount: number;
    isMilestone?: boolean;
  }>;
  allowedBeforeStart: string[];
  allowedAfterStart: string[];
}

export async function listTemplates(): Promise<CanonicalTemplate[]> {
  const response = await apiClient.get<CanonicalTemplate[] | { data: CanonicalTemplate[] }>(
    '/templates',
    {
      params: { mode: 'mvp' },
    },
  );
  return unwrapArray<CanonicalTemplate>(response);
}

export async function listMvpTemplates(): Promise<CanonicalTemplate[]> {
  return listTemplates();
}

export async function getTemplateDetail(
  templateId: string,
): Promise<CanonicalTemplate> {
  const response = await apiClient.get<CanonicalTemplate | { data: CanonicalTemplate }>(
    `/templates/${templateId}`,
    {
      params: { mode: 'mvp' },
    },
  );
  const data = unwrapData<CanonicalTemplate>(response);
  if (!data) {
    throw new Error('Template not found');
  }
  return data;
}

export async function getRecommendations(
  containerType: string,
  workType: string,
): Promise<RecommendationResponse> {
  const response = await apiClient.get<{ data?: RecommendationResponse }>(
    '/templates/recommendations',
    {
      params: {
        containerType,
        workType,
      },
    },
  );
  return response.data?.data ?? { recommended: [], others: [] };
}

export async function getPreview(templateId: string): Promise<PreviewResponse> {
  const response = await apiClient.get<{ data?: PreviewResponse }>(
    `/templates/${templateId}/preview-v5_1`,
  );
  if (!response.data?.data) {
    throw new Error('Template preview not available');
  }
  return response.data.data;
}

export async function instantiateV51(
  templateId: string,
  projectName: string,
): Promise<{ projectId: string }> {
  const response = await apiClient.post<{ data?: { projectId?: string } }>(
    `/templates/${templateId}/instantiate-v5_1`,
    { projectName },
  );

  const projectId = response.data?.data?.projectId;
  if (!projectId) {
    throw new Error('Template instantiation failed');
  }

  return { projectId };
}

export async function createProjectFromTemplate(
  payload: CreateProjectFromTemplateInput,
): Promise<{ id: string; workspaceId?: string }> {
  const response = await apiClient.post<{ id: string; workspaceId?: string } | { data: { id: string; workspaceId?: string } }>(
    '/projects/from-template',
    payload,
  );
  const data = unwrapData<{ id: string; workspaceId?: string }>(response);
  if (!data?.id) {
    throw new Error('Project creation failed');
  }
  return data;
}

export async function applyTemplate(
  type: string,
  payload: { templateId: string; workspaceId: string; projectName?: string },
): Promise<{ id: string; workspaceId?: string }> {
  if (type !== 'project') {
    throw new Error(`Unsupported template apply type: ${type}`);
  }

  return createProjectFromTemplate({
    templateId: payload.templateId,
    workspaceId: payload.workspaceId,
    projectName: payload.projectName ?? 'New Project',
    importOptions: {
      includeViews: true,
      includeTasks: true,
      includePhases: true,
      includeMilestones: true,
      includeCustomFields: false,
      includeDependencies: false,
      remapDates: true,
    },
  });
}
