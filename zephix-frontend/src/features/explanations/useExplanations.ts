// ─────────────────────────────────────────────────────────────────────────────
// useExplanations hook — Step 20.3
//
// Convenience hook that takes context, calls the resolver, and memoizes.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import type { ExplanationContext, Explanation } from './types';
import { resolveExecutionExplanations } from './resolveExplanations';

/**
 * Hook that resolves explanations from the current execution context.
 * Returns an empty array when context is null/undefined.
 */
export function useExplanations(
  ctx: ExplanationContext | null | undefined,
): Explanation[] {
  return useMemo(() => {
    if (!ctx) return [];
    return resolveExecutionExplanations(ctx);
  }, [ctx]);
}
