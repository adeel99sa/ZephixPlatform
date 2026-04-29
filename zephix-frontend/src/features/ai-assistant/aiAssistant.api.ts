import type { AiAssistResponse, AiIntentHint } from './types';

import { apiClient } from '@/lib/api/client';

// ─── Backend contract: zephix-backend pm/controllers/ai-pm-assistant.controller.ts ───

/** Mirrors backend `PMQuestionDto` / `ProjectContext` (subset we send from the SPA). */
export interface AiPmAssistantAskPayload {
  question: string;
  context?: {
    projectId?: string;
    portfolioId?: string;
    programId?: string;
    methodology?: string;
    domain?: string;
    processGroup?: string;
  };
}

/** Mirrors backend `PMResponse` from `AIPMAssistantService.askPMQuestion`. */
export interface PmAssistantResponseBody {
  answer: string;
  confidence: number;
  sources: string[];
  recommendations: string[];
  nextActions: string[];
}

// ─── Request shape used by command palette + project tab ──────────────────────

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

function buildPmQuestion(payload: AiAssistPayload): string {
  const q = payload.userQuery?.trim();
  if (q) {
    const hint = payload.intentHint ? `\n\n[intent: ${payload.intentHint}]` : '';
    return `${q}${hint}`;
  }
  return `Provide concise, actionable guidance for the current screen (${payload.route.pathname}${payload.route.search ?? ''}).`;
}

function buildPmContext(
  payload: AiAssistPayload,
): AiPmAssistantAskPayload['context'] | undefined {
  const projectId = payload.entityContext?.projectId;
  if (!projectId) {
    return undefined;
  }
  return { projectId };
}

/** Maps PM assistant JSON to the command-palette `AiAssistResponse` shape (ranked lists often empty). */
export function mapPmResponseToAiAssist(
  pm: PmAssistantResponseBody,
  latencyMs: number,
): AiAssistResponse {
  return {
    rankedActions: [],
    blockedExplanations: [],
    rankedTemplates: [],
    debug: {
      mode: 'AI',
      latencyMs,
      inputHash: '',
    },
    narrativeSummary: pm.answer,
  };
}

/**
 * Canonical PM assistant endpoint — matches backend `POST /ai-pm-assistant/ask`.
 */
export async function postAiPmAssistantAsk(
  payload: AiAssistPayload,
): Promise<AiAssistResponse> {
  const started = performance.now();
  const body: AiPmAssistantAskPayload = {
    question: buildPmQuestion(payload),
    context: buildPmContext(payload),
  };

  const raw = await apiClient.post<PmAssistantResponseBody>(
    '/ai-pm-assistant/ask',
    body,
  );
  const pm = raw as PmAssistantResponseBody;
  const latencyMs = Math.round(performance.now() - started);

  if (!pm || typeof pm.answer !== 'string') {
    throw new Error('Invalid PM assistant response');
  }

  return mapPmResponseToAiAssist(pm, latencyMs);
}
