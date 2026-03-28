// ─────────────────────────────────────────────────────────────────────────────
// AI Assistant Frontend Types — Phase 3.9
//
// Mirrors backend contracts. AI is read-only. Never invents actions.
// ─────────────────────────────────────────────────────────────────────────────

import { CommandActionId } from '@/features/command-palette/commandPalette.api';

export type AiAssistMode = 'AI' | 'FALLBACK';

export interface RankedAction {
  actionId: CommandActionId;
  score: number;
  rationale: string;
  requiresConfirmWarnings: boolean;
  deepLink?: string;
}

export interface BlockedExplanation {
  actionId: CommandActionId;
  reason: string;
  remediationActionIds: CommandActionId[];
}

export interface RankedTemplate {
  templateActionId: CommandActionId;
  score: number;
  rationale: string;
}

export interface AiAssistDebug {
  mode: AiAssistMode;
  model?: string;
  latencyMs: number;
  inputHash: string;
}

export interface AiAssistResponse {
  rankedActions: RankedAction[];
  blockedExplanations: BlockedExplanation[];
  rankedTemplates: RankedTemplate[];
  debug: AiAssistDebug;
}

export type AiIntentHint = 'NAVIGATION' | 'GOVERNANCE' | 'SETUP' | 'TEMPLATES' | 'GENERAL';
