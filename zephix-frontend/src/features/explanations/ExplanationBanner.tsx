// ─────────────────────────────────────────────────────────────────────────────
// Explanation Banner — Step 20.1
//
// Lightweight read-only banner showing contextual explanations.
// No buttons that mutate state. Navigation links only.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Info, ShieldAlert, ArrowRight } from 'lucide-react';
import type { Explanation, ExplanationSeverity } from './types';
import { intentColors } from '@/design/tokens';
import { trackBeta } from '@/lib/telemetry';

// ─── Visual config per severity (sourced from design tokens) ─────────────────

const SEVERITY_STYLES: Record<
  ExplanationSeverity,
  { bg: string; border: string; icon: string; iconEl: React.ReactNode; leftBorder?: boolean }
> = {
  block: {
    // Step 23: Neutralized — ink bg + danger left border, no red wall
    bg: intentColors.neutral.bg,
    border: intentColors.neutral.border,
    icon: intentColors.danger.text,
    iconEl: <ShieldAlert className={`h-4 w-4 ${intentColors.danger.text} flex-shrink-0 mt-0.5`} />,
    leftBorder: true,
  },
  warn: {
    bg: intentColors.warning.bg,
    border: intentColors.warning.border,
    icon: intentColors.warning.text,
    iconEl: <AlertTriangle className={`h-4 w-4 ${intentColors.warning.text} flex-shrink-0 mt-0.5`} />,
  },
  info: {
    bg: intentColors.info.bg,
    border: intentColors.info.border,
    icon: intentColors.info.text,
    iconEl: <Info className={`h-4 w-4 ${intentColors.info.text} flex-shrink-0 mt-0.5`} />,
  },
};

// ─── Single explanation banner row ───────────────────────────────────────────

interface ExplanationRowProps {
  explanation: Explanation;
}

const ExplanationRow: React.FC<ExplanationRowProps> = ({ explanation }) => {
  const style = SEVERITY_STYLES[explanation.severity];
  const borderClass = style.leftBorder
    ? `border-l-4 border-l-red-400 border ${style.border}`
    : `border ${style.border}`;

  return (
    <div
      className={`flex gap-3 p-3 rounded-lg ${style.bg} ${borderClass}`}
      data-testid={`explanation-${explanation.id}`}
      data-severity={explanation.severity}
    >
      {style.iconEl}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{explanation.title}</p>
        <p className="text-xs text-gray-600 mt-0.5">{explanation.explanation}</p>
        {explanation.suggestedActions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {explanation.suggestedActions.map((action) => (
              <span
                key={action.actionId}
                className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 cursor-pointer"
                data-testid={`explanation-action-${action.actionId}`}
                data-action-id={action.actionId}
              >
                {action.label}
                <ArrowRight className="h-3 w-3" />
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Banner container ────────────────────────────────────────────────────────

interface ExplanationBannerProps {
  /** Array of explanations to display */
  explanations: Explanation[];
  /** Maximum number of explanations to show (default: 5) */
  maxVisible?: number;
  /** Additional CSS class */
  className?: string;
}

/**
 * Contextual explanation banner.
 *
 * Renders when there are explanations. Invisible when empty.
 * No state mutations. Navigation hints only.
 */
export const ExplanationBanner: React.FC<ExplanationBannerProps> = ({
  explanations,
  maxVisible = 5,
  className = '',
}) => {
  // Step 24: Track when explanations are shown (once per non-empty render)
  const tracked = useRef(false);
  useEffect(() => {
    if (explanations && explanations.length > 0 && !tracked.current) {
      tracked.current = true;
      trackBeta('USER_OPENED_EXPLANATION_PANEL', undefined, {
        count: explanations.length,
        severities: explanations.map((e) => e.severity),
      });
    }
  }, [explanations]);

  if (!explanations || explanations.length === 0) return null;

  const visible = explanations.slice(0, maxVisible);
  const remaining = explanations.length - visible.length;

  return (
    <div
      className={`space-y-2 ${className}`}
      data-testid="explanation-banner"
      role="status"
      aria-label="Contextual explanations"
    >
      {visible.map((exp) => (
        <ExplanationRow key={exp.id} explanation={exp} />
      ))}
      {remaining > 0 && (
        <p className="text-xs text-gray-400 text-center">
          +{remaining} more {remaining === 1 ? 'explanation' : 'explanations'}
        </p>
      )}
    </div>
  );
};

export default ExplanationBanner;
