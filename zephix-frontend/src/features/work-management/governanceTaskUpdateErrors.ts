import { toast } from "sonner";
import { isPlatformAdmin } from "@/utils/access";
import { getAuthPlatformRole } from "@/state/authContextBridge";
import {
  emitGovernanceBlockChanged,
  governanceBlockStatusPath,
  parseGovernanceBlockFromError,
  setGovernanceBlockFlash,
  type GovernanceBlockRecord,
} from "@/features/work-management/governanceBlockRecord";

export const GOVERNANCE_EXCEPTIONS_ADMIN_PATH =
  "/administration/governance?tab=exceptions";

const MEMBER_EXCEPTION_STATUS_COPY =
  "Exception requested — pending admin review";

export type NotifyGovernanceBlockContext = {
  projectId?: string | null;
  workspaceId?: string | null;
};

function navigateToBlockStatus(record: GovernanceBlockRecord): void {
  const role = getAuthPlatformRole();
  const admin = isPlatformAdmin({ platformRole: role, role });
  const path = admin
    ? GOVERNANCE_EXCEPTIONS_ADMIN_PATH
    : governanceBlockStatusPath(record);
  window.location.assign(path);
}

function governanceExceptionToastAction(record: GovernanceBlockRecord) {
  return {
    label: "View status",
    onClick: () => {
      navigateToBlockStatus(record);
    },
  };
}

/**
 * If the error is a governance rule BLOCK from PATCH /work/tasks/:id,
 * shows a short confirmation toast, asks banners to refetch from the API,
 * and returns true. Toast is not the record — live status is the exceptions API.
 */
export function notifyGovernanceRuleBlocked(
  err: unknown,
  context?: NotifyGovernanceBlockContext,
): boolean {
  const record = parseGovernanceBlockFromError(err, context);
  if (!record) return false;

  setGovernanceBlockFlash(record);
  emitGovernanceBlockChanged();

  toast.error("Action blocked by governance", {
    description: record.reason,
    duration: 4000,
    action: governanceExceptionToastAction(record),
  });
  return true;
}

/** After a successful bulk update that skipped some rows due to governance BLOCK. */
export function notifyGovernanceBulkPartialSuccess(
  result: {
    updated: number;
    blockedCount?: number;
    blockedTasks?: unknown[];
    exceptionId?: string;
    projectId?: string | null;
    workspaceId?: string | null;
  },
): void {
  const bc =
    typeof result.blockedCount === "number"
      ? result.blockedCount
      : Array.isArray(result.blockedTasks)
        ? result.blockedTasks.length
        : 0;
  if (bc <= 0) return;

  const record: GovernanceBlockRecord = {
    id: result.exceptionId ?? `bulk-block-${Date.now()}`,
    projectId: result.projectId ?? null,
    workspaceId: result.workspaceId ?? null,
    phaseId: null,
    submissionId: null,
    taskId: null,
    blockedAction: `${bc} task${bc === 1 ? "" : "s"} blocked by governance`,
    policyName: "Governance policy",
    policyCodes: [],
    reason: "Exception requests were sent for blocked rows.",
    requiredToClear:
      "Organization admin must approve the exception request before blocked rows can proceed.",
    exceptionStatus: "CREATED",
    waitingOn: "Organization admin",
    exceptionId: result.exceptionId ?? null,
    recordedAt: new Date().toISOString(),
  };
  setGovernanceBlockFlash(record);
  emitGovernanceBlockChanged();

  toast.warning(
    `${bc} task${bc === 1 ? "" : "s"} blocked by governance; ${result.updated} updated.`,
    {
      description: "See the block status on this page for details.",
      duration: 4000,
      action: governanceExceptionToastAction(record),
    },
  );
}

/** Exported for tests / member status copy. */
export const MEMBER_EXCEPTION_STATUS_MESSAGE = MEMBER_EXCEPTION_STATUS_COPY;
