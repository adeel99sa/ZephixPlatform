// ─────────────────────────────────────────────────────────────────────────────
// PhaseExplanationBar — Step 20.3
//
// Small wrapper for use inside phase list rendering.
// Computes explanations from phase data and renders the banner.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo } from 'react';
import { ExplanationBanner } from './ExplanationBanner';
import { resolveExecutionExplanations } from './resolveExplanations';
import type { ExplanationContext } from './types';

interface PhaseExplanationBarProps {
  phase: {
    id: string;
    phaseStatus?: string;
    isLocked?: boolean;
    dueDate?: string | null;
  };
  gate?: {
    blocked: boolean;
    enforcementMode: string;
    warnings: Array<{ code: string; message: string }>;
    requiredActions: string[];
    latestSubmissionStatus?: string | null;
  };
}

export const PhaseExplanationBar: React.FC<PhaseExplanationBarProps> = ({
  phase,
  gate,
}) => {
  const explanations = useMemo(() => {
    const ctx: ExplanationContext = {
      phase: {
        id: phase.id,
        phaseStatus: phase.phaseStatus,
        isLocked: phase.isLocked,
        dueDate: phase.dueDate,
      },
      gate,
    };
    return resolveExecutionExplanations(ctx);
  }, [phase, gate]);

  return <ExplanationBanner explanations={explanations} maxVisible={3} />;
};
