// ─────────────────────────────────────────────────────────────────────────────
// Contextual Explanation Types — Step 20
//
// Read-only explanation layer. No mutations. No enforcement.
// Explains *why* the system is behaving the way it is.
// ─────────────────────────────────────────────────────────────────────────────

import type { CommandActionId } from '@/features/command-palette/commandPalette.api';

/** Severity of the explanation. Drives visual treatment only. */
export type ExplanationSeverity = 'info' | 'warn' | 'block';

/** A single contextual explanation produced by the resolver. */
export interface Explanation {
  /** Stable identifier for deduplication and testing */
  id: string;
  /** Visual severity: info (blue), warn (amber), block (red) */
  severity: ExplanationSeverity;
  /** Short headline — plain language, no jargon */
  title: string;
  /** Longer explanation — what happened and why */
  explanation: string;
  /** Suggested actions — reuse existing cmd+K action IDs only */
  suggestedActions: SuggestedAction[];
}

/** A suggested action that references an existing cmd+K action */
export interface SuggestedAction {
  /** cmd+K action ID — must exist in CommandActionId enum */
  actionId: CommandActionId;
  /** Human-readable label for the link */
  label: string;
}

// ─── Resolver Input Context ──────────────────────────────────────────────────

/** The context bundle passed to resolveExecutionExplanations(). */
export interface ExplanationContext {
  /** Task status / lifecycle / blockedReason if viewing a task */
  task?: {
    id: string;
    status: string;
    lifecycle?: string;
    blockedReason?: string | null;
    isBlockedByDependencies?: boolean;
    blockingTaskCount?: number;
    dueDate?: string | null;
    completedAt?: string | null;
  };

  /** Phase details if viewing a phase */
  phase?: {
    id: string;
    phaseStatus?: string;
    isLocked?: boolean;
    dueDate?: string | null;
  };

  /** Schedule variance data */
  schedule?: {
    status: string; // ON_TRACK | AT_RISK | DELAYED | AHEAD
    endVarianceDays?: number | null;
    startVarianceDays?: number | null;
    forecastEndDate?: string | null;
  };

  /** Resource allocation data */
  resource?: {
    isOverAllocated?: boolean;
    totalAllocationPercent?: number | null;
    utilizationPercent?: number | null;
    riskDrivers?: string[];
  };

  /** Policy resolution results */
  policies?: {
    governanceEnabled: boolean;
    appliedPolicies?: Array<{
      key: string;
      resolvedValue: unknown;
      source: string;
    }>;
  };

  /** Gate evaluation result */
  gate?: {
    blocked: boolean;
    enforcementMode: string; // SOFT | HARD | OFF
    warnings: Array<{ code: string; message: string }>;
    requiredActions: string[];
    latestSubmissionStatus?: string | null;
  };
}
