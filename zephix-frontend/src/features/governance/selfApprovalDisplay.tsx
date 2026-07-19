/**
 * SOD-RENDER-1 Unit 1 — visible self-approval disclosure.
 * Copy is neutral and factual (LEAN/STANDARD allow self-approval).
 */

import { cn } from "@/lib/utils";

/** Dispatch copy — do not reword casually; shared across queue, banner, gate, CR. */
export const SELF_APPROVED_LABEL = "Self-approved (no separate approver)";

export function isSelfApprovedFlag(value: unknown): boolean {
  return value === true;
}

/**
 * Prefer a display name when the DTO provides one.
 * Actor identity fields on current governance DTOs are ids only (backend gap).
 */
export function formatGovernanceActorLabel(opts: {
  id?: string | null;
  displayName?: string | null;
}): string | null {
  const name = opts.displayName?.trim();
  if (name) return name;
  const id = opts.id?.trim();
  if (!id) return null;
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

export function SelfApprovedBadge({
  className,
  testId,
}: {
  className?: string;
  testId?: string;
}): JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-neutral-800",
        className,
      )}
      data-testid={testId ?? "self-approved-badge"}
      title={SELF_APPROVED_LABEL}
    >
      {SELF_APPROVED_LABEL}
    </span>
  );
}
