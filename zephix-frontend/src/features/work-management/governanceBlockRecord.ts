/**
 * Governance block helpers (GOV-BUILD WAVE1 Unit 3).
 * Live status comes from GET /work/projects/:id/exceptions — never sessionStorage.
 * sessionStorage is optional flash-on-navigation only (not status).
 */

import { POLICY_UI_META } from "@/features/administration/constants/governance-policies";

export type GovernanceBlockExceptionStatus =
  | "PENDING"
  | "CREATED"
  | "APPROVED"
  | "REJECTED"
  | "UNKNOWN";

/** Parsed from a BLOCK error — used for toast navigation, not as status truth. */
export type GovernanceBlockRecord = {
  id: string;
  projectId: string | null;
  workspaceId: string | null;
  phaseId: string | null;
  submissionId: string | null;
  taskId: string | null;
  blockedAction: string;
  policyName: string;
  policyCodes: string[];
  reason: string;
  requiredToClear: string;
  exceptionStatus: GovernanceBlockExceptionStatus;
  waitingOn: string;
  exceptionId: string | null;
  recordedAt: string;
};

const FLASH_KEY = "zephix.governanceBlockFlash.v1";

export function policyDisplayName(code: string): string {
  return POLICY_UI_META[code]?.displayName ?? code.replace(/[._-]/g, " ");
}

export function resolvePolicyNames(codes: string[], messages: string[]): string {
  if (codes.length > 0) {
    return codes.map(policyDisplayName).join(", ");
  }
  if (messages[0]?.trim()) return messages[0].trim();
  return "Governance policy";
}

export function requiredToClearCopy(args: {
  hasPhaseGate: boolean;
  exceptionStatus: GovernanceBlockExceptionStatus;
}): string {
  if (args.hasPhaseGate) {
    return "Complete the phase-gate evidence checklist and obtain organization admin approval.";
  }
  if (args.exceptionStatus === "PENDING" || args.exceptionStatus === "CREATED") {
    return "Organization admin must approve the exception request before you can retry.";
  }
  return "Resolve the blocking policy condition, or request an exception from your organization admin.";
}

export function waitingOnCopy(status: GovernanceBlockExceptionStatus): string {
  switch (status) {
    case "APPROVED":
      return "Cleared — you may retry the action";
    case "REJECTED":
      return "Exception rejected — contact your organization admin";
    case "PENDING":
    case "CREATED":
      return "Organization admin";
    default:
      return "Organization admin";
  }
}

/** Notify banners to refetch from the API (not from cache). */
export function emitGovernanceBlockChanged(): void {
  window.dispatchEvent(new CustomEvent("governance-block:changed"));
}

/**
 * Optional flash for post-block navigation. Never read as exception status.
 * Cleared after one read.
 */
export function setGovernanceBlockFlash(record: GovernanceBlockRecord): void {
  try {
    sessionStorage.setItem(FLASH_KEY, JSON.stringify({ id: record.id, at: Date.now() }));
  } catch {
    // ignore
  }
}

export function consumeGovernanceBlockFlash(): { id: string; at: number } | null {
  try {
    const raw = sessionStorage.getItem(FLASH_KEY);
    sessionStorage.removeItem(FLASH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { id: string; at: number };
  } catch {
    return null;
  }
}

export function governanceBlockStatusPath(record: {
  projectId: string | null;
  phaseId: string | null;
  submissionId?: string | null;
}): string {
  if (record.projectId && record.phaseId) {
    const q = new URLSearchParams({ phaseId: record.phaseId });
    if (record.submissionId) q.set("submissionId", record.submissionId);
    return `/work/projects/${record.projectId}/plan?${q.toString()}`;
  }
  if (record.projectId) {
    return `/projects/${record.projectId}#overview-exceptions-strip`;
  }
  return "/administration/governance?tab=exceptions";
}

export function parseGovernanceBlockFromError(
  err: unknown,
  context?: { projectId?: string | null; workspaceId?: string | null },
): GovernanceBlockRecord | null {
  const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
  if (!data || data.code !== "GOVERNANCE_RULE_BLOCKED") return null;

  const policyMessages = Array.isArray(data.policyMessages)
    ? (data.policyMessages as unknown[]).filter(
        (m): m is string => typeof m === "string" && m.trim() !== "",
      )
    : [];
  const policyCodes = Array.isArray(data.policyCodes)
    ? (data.policyCodes as unknown[]).filter(
        (c): c is string => typeof c === "string" && c.trim() !== "",
      )
    : [];
  const reasons = Array.isArray(data.reasons)
    ? (data.reasons as Array<{ code?: string; message?: string }>)
    : [];
  if (policyCodes.length === 0) {
    for (const r of reasons) {
      if (r?.code) policyCodes.push(r.code);
    }
  }
  if (policyMessages.length === 0) {
    for (const r of reasons) {
      if (r?.message) policyMessages.push(r.message);
    }
  }

  const exceptionId = typeof data.exceptionId === "string" ? data.exceptionId : null;
  const submissionId = typeof data.submissionId === "string" ? data.submissionId : null;
  const meta = (
    data.metadata && typeof data.metadata === "object"
      ? (data.metadata as Record<string, unknown>)
      : {}
  ) as Record<string, unknown>;
  const phaseId =
    typeof meta.phaseId === "string"
      ? meta.phaseId
      : typeof data.phaseId === "string"
        ? data.phaseId
        : null;
  const taskId =
    typeof meta.taskId === "string"
      ? meta.taskId
      : typeof data.taskId === "string"
        ? data.taskId
        : null;

  const rawStatus = String(data.exceptionStatus ?? "UNKNOWN").toUpperCase();
  const exceptionStatus: GovernanceBlockExceptionStatus =
    rawStatus === "PENDING" ||
    rawStatus === "CREATED" ||
    rawStatus === "APPROVED" ||
    rawStatus === "REJECTED"
      ? rawStatus
      : exceptionId
        ? "CREATED"
        : "UNKNOWN";

  const primaryMessage =
    policyMessages[0] ||
    (typeof data.message === "string" ? data.message : "") ||
    "This action is blocked by a governance policy.";

  const hasPhaseGate = Boolean(phaseId) || policyCodes.some((c) => /gate|PHASE_GATE/i.test(c));

  return {
    id: exceptionId ?? `block-${Date.now()}`,
    projectId: context?.projectId ?? (typeof data.projectId === "string" ? data.projectId : null),
    workspaceId:
      context?.workspaceId ?? (typeof data.workspaceId === "string" ? data.workspaceId : null),
    phaseId,
    submissionId,
    taskId,
    blockedAction: primaryMessage,
    policyName: resolvePolicyNames(policyCodes, policyMessages),
    policyCodes,
    reason: primaryMessage,
    requiredToClear: requiredToClearCopy({ hasPhaseGate, exceptionStatus }),
    exceptionStatus,
    waitingOn: waitingOnCopy(exceptionStatus),
    exceptionId,
    recordedAt: new Date().toISOString(),
  };
}
