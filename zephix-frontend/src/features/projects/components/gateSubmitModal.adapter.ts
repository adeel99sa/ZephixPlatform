import type { GateSubmitApproverRow } from "./gateSubmit.types";

import type { ApprovalChain } from "@/features/phase-gates/phaseGates.api";

/**
 * Maps approval-chain steps to read-only approver rows for the submit modal.
 */
export function approversFromApprovalChain(
  chain: ApprovalChain | null,
): GateSubmitApproverRow[] {
  if (!chain?.steps?.length) {
    return [];
  }
  const ordered = [...chain.steps].sort((a, b) => a.stepOrder - b.stepOrder);
  return ordered.map((s) => ({
    id: s.id,
    name: s.name,
    roleLabel: s.requiredRole ?? null,
  }));
}
