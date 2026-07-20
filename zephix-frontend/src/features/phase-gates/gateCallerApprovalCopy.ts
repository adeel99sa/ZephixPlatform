/**
 * SOD-RENDER-1 Unit 2 — map approval-state tokens to user-facing copy.
 * Tokens are stable machine codes from the API. Do not invent eligibility client-side.
 */

export type CallerCannotApproveReasonToken =
  | "SELF_APPROVAL_NOT_PERMITTED"
  | "NOT_ELIGIBLE_ROLE"
  | "ALREADY_DECIDED"
  | "NOT_ACTIVE_STEP"
  | string;

const KNOWN_REASON_COPY: Record<string, string> = {
  SELF_APPROVAL_NOT_PERMITTED:
    "You submitted this gate; a separate approver is required.",
  NOT_ELIGIBLE_ROLE: "Your role is not eligible to approve this step.",
  ALREADY_DECIDED: "You have already recorded a decision on this gate.",
  NOT_ACTIVE_STEP: "There is no active approval step for you right now.",
};

const GENERIC_REASON_COPY =
  "You cannot approve this gate right now.";

const MISSING_FIELDS_COPY =
  "Approval eligibility is unavailable. Refresh and try again.";

export function copyForCannotApproveReason(
  token: string | null | undefined,
): string {
  if (!token) return GENERIC_REASON_COPY;
  const known = KNOWN_REASON_COPY[token];
  if (known) return known;
  console.warn(
    "[SOD-RENDER-1] Unknown callerCannotApproveReason token:",
    token,
  );
  return GENERIC_REASON_COPY;
}

export type CallerApprovalAffordance = {
  /** Fields present and parsed from approval-state. */
  fieldsPresent: boolean;
  /** True only when API says the caller may approve. */
  callerCanApprove: boolean;
  /** User-facing reason when approval is blocked; null when allowed. */
  reasonCopy: string | null;
};

/**
 * Resolve Approve affordance from approval-state.
 * If callerCanApprove is absent → fieldsPresent=false, Approve must stay disabled.
 */
export function resolveCallerApprovalAffordance(state: {
  callerCanApprove?: boolean;
  callerCannotApproveReason?: string | null;
} | null): CallerApprovalAffordance {
  if (!state) {
    return {
      fieldsPresent: false,
      callerCanApprove: false,
      reasonCopy: MISSING_FIELDS_COPY,
    };
  }
  if (typeof state.callerCanApprove !== "boolean") {
    console.warn(
      "[SOD-RENDER-1] approval-state missing callerCanApprove — Approve stays disabled",
    );
    return {
      fieldsPresent: false,
      callerCanApprove: false,
      reasonCopy: MISSING_FIELDS_COPY,
    };
  }
  if (state.callerCanApprove) {
    return {
      fieldsPresent: true,
      callerCanApprove: true,
      reasonCopy: null,
    };
  }
  return {
    fieldsPresent: true,
    callerCanApprove: false,
    reasonCopy: copyForCannotApproveReason(state.callerCannotApproveReason),
  };
}
