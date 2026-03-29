import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { GateSubmitModal } from "../GateSubmitModal";
import { InlineGateRow } from "../InlineGateRow";
import { toInlinePhaseGateFromApi } from "../inlinePhaseGate.adapter";

const submitPhaseGateForReview = vi.fn();

vi.mock("@/features/projects/governance.api", () => ({
  submitPhaseGateForReview: (...args: unknown[]) =>
    submitPhaseGateForReview(...args),
}));

describe("C-4 gate submit integration (modal + adapter-driven row)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    submitPhaseGateForReview.mockResolvedValue({
      id: "approval-1",
      status: "SUBMITTED",
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("opens submit modal, submits, calls onSuccess; gate row shows IN_REVIEW only via adapter output", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    render(
      <GateSubmitModal
        open
        onClose={onClose}
        onSuccess={onSuccess}
        projectId="proj-1"
        phaseId="ph-1"
        phaseName="Discovery"
        gate={{ id: "gate-1", name: "Planning Gate", state: "READY" }}
        artifactTasks={[
          {
            id: "t-ga",
            name: "Gate doc",
            effectiveState: "DONE",
            dueDate: null,
            assigneeInitials: "AB",
          },
        ]}
        approvers={[{ id: "s1", name: "Approver One", roleLabel: "PM" }]}
      />,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Submit.*Planning Gate.*for Review/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Submit to Approvers/i }));

    await waitFor(() => {
      expect(submitPhaseGateForReview).toHaveBeenCalledWith(
        "proj-1",
        "ph-1",
        "gate-1",
        "",
      );
    });
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    await waitFor(() => expect(onClose).toHaveBeenCalled());

    cleanup();

    const afterSubmit = toInlinePhaseGateFromApi({
      id: "gate-1",
      name: "Planning Gate",
      phaseId: "ph-1",
      reviewState: "IN_REVIEW",
    });
    expect(afterSubmit?.state).toBe("IN_REVIEW");

    render(<InlineGateRow gate={afterSubmit!} />);
    expect(screen.getByText("In Review")).toBeInTheDocument();
  });
});
