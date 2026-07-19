/**
 * SOD-RENDER-1 Unit 2 — callerCanApprove affordance (never client-side SoD).
 */
import { describe, it, expect, vi, afterEach } from "vitest";

import {
  copyForCannotApproveReason,
  resolveCallerApprovalAffordance,
} from "@/features/phase-gates/gateCallerApprovalCopy";

describe("SOD-RENDER-1 Unit 2 — gateCallerApprovalCopy", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps SELF_APPROVAL_NOT_PERMITTED to submitter copy", () => {
    expect(copyForCannotApproveReason("SELF_APPROVAL_NOT_PERMITTED")).toBe(
      "You submitted this gate; a separate approver is required.",
    );
  });

  it("unknown token uses generic copy and warns", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(copyForCannotApproveReason("FUTURE_TOKEN_X")).toBe(
      "You cannot approve this gate right now.",
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("Unknown callerCannotApproveReason"),
      "FUTURE_TOKEN_X",
    );
  });

  it("disables Approve when callerCanApprove is false", () => {
    const affordance = resolveCallerApprovalAffordance({
      callerCanApprove: false,
      callerCannotApproveReason: "SELF_APPROVAL_NOT_PERMITTED",
    });
    expect(affordance.fieldsPresent).toBe(true);
    expect(affordance.callerCanApprove).toBe(false);
    expect(affordance.reasonCopy).toContain("separate approver");
  });

  it("enables Approve when callerCanApprove is true", () => {
    const affordance = resolveCallerApprovalAffordance({
      callerCanApprove: true,
      callerCannotApproveReason: null,
    });
    expect(affordance.fieldsPresent).toBe(true);
    expect(affordance.callerCanApprove).toBe(true);
    expect(affordance.reasonCopy).toBeNull();
  });

  it("STOP: missing callerCanApprove keeps Approve disabled (no client SoD shim)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const affordance = resolveCallerApprovalAffordance({
      callerCannotApproveReason: null,
    } as { callerCanApprove?: boolean; callerCannotApproveReason?: string | null });
    expect(affordance.fieldsPresent).toBe(false);
    expect(affordance.callerCanApprove).toBe(false);
    expect(affordance.reasonCopy).toMatch(/unavailable/i);
    expect(warn).toHaveBeenCalled();
  });
});
