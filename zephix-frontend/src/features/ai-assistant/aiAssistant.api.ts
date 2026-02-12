import type { AiAssistResponse, AiIntentHint } from './types';

import { apiClient } from '@/lib/api/client';

// ─── Request ─────────────────────────────────────────────────────────────────

export interface AiAssistPayload {
  route: { pathname: string; search?: string };
  entityContext?: {
    projectId?: string;
    phaseId?: string;
    taskId?: string;
    sprintId?: string;
    changeRequestId?: string;
    documentId?: string;
  };
  userQuery?: string;
  intentHint?: AiIntentHint;
}

// ─── API call ────────────────────────────────────────────────────────────────

export async function getAiSuggestions(
  payload: AiAssistPayload,
): Promise<AiAssistResponse> {
  const resp = await apiClient.post<{ data?: AiAssistResponse }>('/ai/assist', payload);
  const raw = (resp as any)?.data ?? resp;
  return raw as AiAssistResponse;
}
