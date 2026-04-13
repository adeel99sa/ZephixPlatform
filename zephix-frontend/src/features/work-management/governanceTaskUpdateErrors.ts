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
  const blockedTasks = Array.isArray(data.blockedTasks) ? data.blockedTasks : [];
  const blockedCount =
    typeof data.blockedCount === "number"
      ? data.blockedCount
      : blockedTasks.length > 0
        ? blockedTasks.length
        : 0;
  const exceptionId = typeof data.exceptionId === "string" ? data.exceptionId : null;
  const exceptionStatus = data.exceptionStatus === "PENDING" ? "PENDING" : "CREATED";

  const descriptionPending =
    "An exception request is already pending organization admin review.";
  const descriptionCreated =
    "An exception request has been sent to your organization admin for review.";

  toast.error(
    primary
      ? `Governance: ${primary}`
      : blockedCount > 0
        ? `Governance blocked ${blockedCount} task${blockedCount === 1 ? "" : "s"}.`
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

/** After a successful bulk update that skipped some rows due to governance BLOCK. */
export function notifyGovernanceBulkPartialSuccess(result: {
  updated: number;
  blockedCount?: number;
  blockedTasks?: unknown[];
}): void {
  const bc =
    typeof result.blockedCount === "number"
      ? result.blockedCount
      : Array.isArray(result.blockedTasks)
        ? result.blockedTasks.length
        : 0;
  if (bc <= 0) return;
  toast.warning(
    `${bc} task${bc === 1 ? "" : "s"} blocked by governance; ${result.updated} updated.`,
    {
      description: "Exception requests were sent for blocked rows.",
      duration: 7000,
    },
  );
}
