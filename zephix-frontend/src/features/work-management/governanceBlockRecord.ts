/**
 * Persistent governance block record (GOV-BUILD WAVE1 Unit 3).
 * Survives reload via sessionStorage while the block/exception is live.
 * Server project exceptions remain the source of truth on Overview.
 */

import { POLICY_UI_META } from "@/features/administration/constants/governance-policies";

export type GovernanceBlockExceptionStatus =
  | "PENDING"
  | "CREATED"
  | "APPROVED"
  | "REJECTED"
  | "UNKNOWN";

export type GovernanceBlockRecord = {
  id: string;
  projectId: string | null;
  workspaceId: string | null;
  phaseId: string | null;
  submissionId: string | null;
  taskId: string | null;
  /** What was blocked (action / message). */
  blockedAction: string;
  /** Human policy name(s) — never raw-only when a label exists. */
  policyName: string;
  policyCodes: string[];
  reason: string;
  /** What is required to clear the block. */
  requiredToClear: string;
  exceptionStatus: GovernanceBlockExceptionStatus;
  /** Who the exception is waiting on (display label). */
  waitingOn: string;
  exceptionId: string | null;
  recordedAt: string;
};

const STORAGE_KEY = "zephix.governanceBlocks.v1";

function readAll(): GovernanceBlockRecord[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as GovernanceBlockRecord[]) : [];
  } catch {
    return [];
  }
}

function writeAll(rows: GovernanceBlockRecord[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    // sessionStorage full / unavailable — in-memory only for this tab session
  }
}

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

export function upsertGovernanceBlock(record: GovernanceBlockRecord): void {
  const rows = readAll().filter((r) => r.id !== record.id);
  rows.unshift(record);
  writeAll(rows.slice(0, 20));
  window.dispatchEvent(new CustomEvent("governance-block:changed"));
}

export function clearGovernanceBlock(id: string): void {
  writeAll(readAll().filter((r) => r.id !== id));
  window.dispatchEvent(new CustomEvent("governance-block:changed"));
}

export function listGovernanceBlocks(filter?: {
  projectId?: string | null;
}): GovernanceBlockRecord[] {
  const rows = readAll().filter(
    (r) => r.exceptionStatus === "PENDING" || r.exceptionStatus === "CREATED",
  );
  if (!filter?.projectId) return rows;
  return rows.filter((r) => r.projectId === filter.projectId);
}

export function governanceBlockStatusPath(record: GovernanceBlockRecord): string {
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
    ? (data.policyMessages as unknown[]).filter((m): m is string => typeof m === "string" && m.trim() !== "")
    : [];
  const policyCodes = Array.isArray(data.policyCodes)
    ? (data.policyCodes as unknown[]).filter((c): c is string => typeof c === "string" && c.trim() !== "")
    : [];
  const reasons = Array.isArray(data.reasons) ? (data.reasons as Array<{ code?: string; message?: string }>) : [];
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
  const meta = (data.metadata && typeof data.metadata === "object"
    ? (data.metadata as Record<string, unknown>)
    : {}) as Record<string, unknown>;
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
