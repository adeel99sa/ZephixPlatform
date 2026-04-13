import { toast } from "sonner";

/**
 * If the error is a governance rule BLOCK from PATCH /work/tasks/:id,
 * shows a governance-specific toast and returns true.
 * Otherwise returns false (caller should use generic error handling).
 */
export function notifyGovernanceRuleBlocked(err: unknown): boolean {
  const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
  if (!data || data.code !== "GOVERNANCE_RULE_BLOCKED") {
    return false;
  }

  const policyMessages = Array.isArray(data.policyMessages)
    ? (data.policyMessages as unknown[]).filter((m) => typeof m === "string" && String(m).trim())
    : [];
  const primary = policyMessages[0] as string | undefined;
  const exceptionId = typeof data.exceptionId === "string" ? data.exceptionId : null;
  const exceptionStatus = data.exceptionStatus === "PENDING" ? "PENDING" : "CREATED";

  const descriptionPending =
    "An exception request is already pending organization admin review.";
  const descriptionCreated =
    "An exception request has been sent to your organization admin for review.";

  toast.error(
    primary
      ? `Governance: ${primary}`
      : "This action is blocked by a governance policy.",
    {
      description: exceptionId
        ? exceptionStatus === "PENDING"
          ? descriptionPending
          : descriptionCreated
        : "Contact your organization admin to request an exception.",
      duration: exceptionStatus === "PENDING" ? 5000 : 6000,
    },
  );
  return true;
}
