import { describe, it, expect } from "vitest";

import type { ApprovalChain } from "@/features/phase-gates/phaseGates.api";

import { approversFromApprovalChain } from "../gateSubmitModal.adapter";

function step(
  id: string,
  stepOrder: number,
  name: string,
): ApprovalChain["steps"][number] {
  return {
    id,
    chainId: "c1",
    stepOrder,
    name,
    description: null,
    requiredRole: "PM",
    requiredUserId: null,
    approvalType: "ANY_ONE",
    minApprovals: 1,
    autoApproveAfterHours: null,
  };
}

describe("approversFromApprovalChain", () => {
  it("orders rows by stepOrder ascending (backend chain semantics)", () => {
    const chain: ApprovalChain = {
      id: "c1",
      gateDefinitionId: "g1",
      name: "Chain",
      description: null,
      isActive: true,
      steps: [step("s3", 3, "Third"), step("s1", 1, "First"), step("s2", 2, "Second")],
    };
    const rows = approversFromApprovalChain(chain);
    expect(rows.map((r) => r.name)).toEqual(["First", "Second", "Third"]);
    expect(rows.map((r) => r.id)).toEqual(["s1", "s2", "s3"]);
  });

  it("returns empty when chain is null or has no steps", () => {
    expect(approversFromApprovalChain(null)).toEqual([]);
    expect(
      approversFromApprovalChain({
        id: "c1",
        gateDefinitionId: "g1",
        name: "C",
        description: null,
        isActive: true,
        steps: [],
      }),
    ).toEqual([]);
  });
});
