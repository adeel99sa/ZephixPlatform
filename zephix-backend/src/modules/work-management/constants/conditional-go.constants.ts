/**
 * Namespaced under PhaseGateDefinition.thresholds (JSON).
 * @see F-2 governance remediation — auto vs manual conditional-go progression.
 */
export const CONDITIONAL_GO_PROGRESSION_KEY = 'conditionalGoProgression' as const;

export type ConditionalGoProgressionMode = 'auto' | 'manual';

export function parseConditionalGoProgression(
  thresholds: Record<string, unknown> | null | undefined,
): ConditionalGoProgressionMode {
  const raw = thresholds?.[CONDITIONAL_GO_PROGRESSION_KEY];
  if (raw === 'manual') {
    return 'manual';
  }
  return 'auto';
}
