// Phase 4.3: Dashboard API Client with Workspace Header Enforcement
import { api } from "@/lib/api";
import { getWorkspaceHeader, WorkspaceRequiredError } from "./workspace-header";
import {
  DashboardEntitySchema,
  DashboardTemplateSchema,
  AISuggestResponseSchema,
  AIGenerateResponseSchema,
  SharedDashboardSchema,
} from "./schemas";
import type {
  DashboardEntity,
  DashboardTemplate,
  AISuggestResponse,
  AIGenerateResponse,
  SharedDashboardEntity,
} from "./types";

// Legacy type for backward compatibility
export type Dashboard = {
  id: string;
  name: string;
  workspaceId: string;
  orgId?: string;
  widgets?: any[];
  filters?: any;
  version?: number;
  etag?: string;
  deletedAt?: string | null;
  visibility?: 'private' | 'workspace' | 'org';
};

/**
 * Get headers with workspace ID and optional additional headers
 */
function getHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
  const workspaceHeader = getWorkspaceHeader();
  return {
    ...workspaceHeader,
    ...additionalHeaders,
  };
}

/**
 * Fetch a single dashboard by ID
 * Includes x-workspace-id header and validates response with zod
 */
export async function fetchDashboard(id: string): Promise<DashboardEntity> {
  try {
    const response = await api.get(`/api/dashboards/${id}`, {
      headers: getHeaders(),
    });

    // Parse and validate with zod, then cast to DashboardEntity
    const parsed = DashboardEntitySchema.parse(response);
    return parsed as DashboardEntity;
  } catch (error: unknown) {
    if (error instanceof WorkspaceRequiredError) {
      throw error;
    }
    const err = error as { response?: { headers?: Record<string, string>; data?: unknown } };
    const requestId = err?.response?.headers?.['x-request-id'];
    if (requestId && err?.response?.data) {
      console.error(`Dashboard schema invalid (requestId: ${requestId}):`, err.response.data);
      throw new Error(`Dashboard schema invalid. RequestId: ${requestId}`);
    }
    throw error;
  }
}

/**
 * List all dashboards
 * Includes x-workspace-id header
 */
export async function listDashboards(): Promise<DashboardEntity[]> {
  const response = await api.get(`/api/dashboards`, {
    headers: getHeaders(),
  });

  // Validate array of dashboards
  if (Array.isArray(response)) {
    return response.map((item) => DashboardEntitySchema.parse(item) as DashboardEntity);
  }
  if (response?.data && Array.isArray(response.data)) {
    return response.data.map((item: unknown) => DashboardEntitySchema.parse(item) as DashboardEntity);
  }
  return [];
}

/**
 * Create a new dashboard
 * Includes x-workspace-id header
 */
export async function createDashboard(payload: Partial<DashboardEntity>): Promise<DashboardEntity> {
  const response = await api.post(`/api/dashboards`, payload, {
    headers: getHeaders({
      "Idempotency-Key": crypto.randomUUID(),
    }),
  });

  return DashboardEntitySchema.parse(response) as DashboardEntity;
}

/**
 * Update a dashboard
 * Includes x-workspace-id header
 */
export async function patchDashboard(
  id: string,
  payload: Partial<DashboardEntity>,
  etag?: string
): Promise<DashboardEntity> {
  const headers: Record<string, string> = getHeaders();
  if (etag) {
    headers["If-Match"] = etag;
  }

  const response = await api.patch(`/api/dashboards/${id}`, payload, { headers });
  return DashboardEntitySchema.parse(response) as DashboardEntity;
}

/**
 * Delete a dashboard
 * Includes x-workspace-id header
 */
export async function deleteDashboard(id: string): Promise<void> {
  await api.delete(`/api/dashboards/${id}`, {
    headers: getHeaders(),
  });
}

/**
 * Duplicate a dashboard
 * Includes x-workspace-id header
 */
export async function duplicateDashboard(id: string): Promise<DashboardEntity> {
  const response = await api.post(`/api/dashboards/${id}/duplicate`, {}, {
    headers: getHeaders(),
  });
  return DashboardEntitySchema.parse(response) as DashboardEntity;
}

/**
 * Restore a dashboard
 * Includes x-workspace-id header
 */
export async function restoreDashboard(id: string): Promise<DashboardEntity> {
  const response = await api.post(`/api/dashboards/${id}/restore`, {}, {
    headers: getHeaders(),
  });
  return DashboardEntitySchema.parse(response) as DashboardEntity;
}

/**
 * List dashboard templates
 * Includes x-workspace-id header
 */
export async function listTemplates(): Promise<DashboardTemplate[]> {
  const response = await api.get(`/api/dashboards/templates`, {
    headers: getHeaders(),
  });

  if (Array.isArray(response)) {
    return response.map((item) => DashboardTemplateSchema.parse(item) as DashboardTemplate);
  }
  if (response?.data && Array.isArray(response.data)) {
    return response.data.map((item: unknown) => DashboardTemplateSchema.parse(item) as DashboardTemplate);
  }
  return [];
}

/**
 * Activate a dashboard template
 * Includes x-workspace-id header
 */
export async function activateTemplate(templateKey: string): Promise<DashboardEntity> {
  const response = await api.post(
    `/api/dashboards/activate-template`,
    { templateKey },
    {
      headers: getHeaders(),
    }
  );

  return DashboardEntitySchema.parse(response) as DashboardEntity;
}

/**
 * AI Suggest templates and widgets
 * Includes x-workspace-id header
 * Note: Backend expects persona enum, not prompt for suggest endpoint
 */
export async function aiSuggest(prompt: string, persona?: string): Promise<AISuggestResponse> {
  // Backend requires persona enum. Map prompt keywords to persona or use provided/default
  // Persona enum values: RESOURCE_MANAGER, PMO, EXEC, PROGRAM_MANAGER, PROJECT_MANAGER, DELIVERY_LEAD
  let mappedPersona = persona || "PMO"; // Default to PMO

  // Simple keyword-based mapping from prompt
  const promptLower = prompt.toLowerCase();
  if (promptLower.includes("resource") || promptLower.includes("utilization")) {
    mappedPersona = "RESOURCE_MANAGER";
  } else if (promptLower.includes("exec") || promptLower.includes("executive") || promptLower.includes("portfolio")) {
    mappedPersona = "EXEC";
  } else if (promptLower.includes("program")) {
    mappedPersona = "PROGRAM_MANAGER";
  } else if (promptLower.includes("project manager") || promptLower.includes("pm")) {
    mappedPersona = "PROJECT_MANAGER";
  } else if (promptLower.includes("delivery")) {
    mappedPersona = "DELIVERY_LEAD";
  }

  const response = await api.post(
    `/api/ai/dashboards/suggest`,
    { persona: mappedPersona },
    {
      headers: getHeaders(),
    }
  );

  // Backend returns { data: { templateKey, widgetSuggestions } }
  const rawResponse = response as { data?: unknown };
  const data = rawResponse?.data || response;
  return AISuggestResponseSchema.parse(data) as AISuggestResponse;
}

/**
 * AI Generate dashboard schema
 * Includes x-workspace-id header
 */
export async function aiGenerate(prompt: string, persona?: string): Promise<AIGenerateResponse> {
  const response = await api.post(
    `/api/ai/dashboards/generate`,
    { prompt, persona },
    {
      headers: getHeaders(),
    }
  );

  // Backend returns { data: { name, visibility, widgets } }
  const rawResponse = response as { data?: unknown };
  const data = rawResponse?.data || response;
  return AIGenerateResponseSchema.parse(data) as AIGenerateResponse;
}

/**
 * Enable sharing for a dashboard
 * Returns share URL path (relative path, not full URL)
 */
export async function enableShare(dashboardId: string, expiresAt?: string): Promise<{ shareUrlPath: string }> {
  const response = await api.post(`/api/dashboards/${dashboardId}/share-enable`, { expiresAt }, {
    headers: getHeaders(),
  });
  const rawResponse = response as { data?: { shareUrlPath: string }; shareUrlPath?: string };
  return rawResponse.data || { shareUrlPath: rawResponse.shareUrlPath || '' };
}

/**
 * Disable sharing for a dashboard
 */
export async function disableShare(dashboardId: string): Promise<void> {
  await api.post(`/api/dashboards/${dashboardId}/share-disable`, {}, {
    headers: getHeaders(),
  });
}

/**
 * Fetch dashboard using share token (public access, no JWT required)
 */
export async function fetchDashboardPublic(dashboardId: string, shareToken: string): Promise<SharedDashboardEntity> {
  const response = await api.get(`/api/dashboards/${dashboardId}`, {
    params: { share: shareToken },
    // No Authorization header, no workspace header
  });
  const rawResponse = response as { data?: unknown };
  return SharedDashboardSchema.parse(rawResponse.data || response) as SharedDashboardEntity;
}
