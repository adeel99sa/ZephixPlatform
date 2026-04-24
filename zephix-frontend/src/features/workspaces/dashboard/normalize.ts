/**
 * Workspace dashboard data normalization — defense-in-depth safety layer.
 *
 * This is the SECOND line of defense. The FIRST line is the API client
 * (api.ts) which validates response shapes and logs contract violations.
 * This normalizer catches anything the API client missed.
 *
 * TODO: Phase 3 — replace this normalizer with backend DTO validation
 * (class-validator decorators on response DTOs) so the API contract is
 * enforced at the source. This file becomes a thin passthrough once
 * the backend guarantees response shapes via DTOs.
 *
 * Rules:
 * - Arrays are ALWAYS arrays (never null, never undefined)
 * - Numbers are ALWAYS numbers (never NaN, never undefined)
 * - Objects are ALWAYS objects (never null)
 * - Strings are ALWAYS strings (never null, never undefined)
 */

import type {
  DashboardSummary,
  DashboardMilestone,
  DashboardRisksResponse,
  WorkspaceHealthData,
  WorkspaceSummary,
} from '../api';

/* ── Safe accessors ──────────────────────────────────────────── */

function safeArray<T>(val: unknown): T[] {
  return Array.isArray(val) ? val : [];
}

function safeNumber(val: unknown, fallback = 0): number {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  return fallback;
}

function safeObject<T extends Record<string, unknown>>(val: unknown): T {
  return (val && typeof val === 'object' && !Array.isArray(val) ? val : {}) as T;
}

function safeString(val: unknown, fallback = ''): string {
  return typeof val === 'string' ? val : fallback;
}

/* ── Normalizers ─────────────────────────────────────────────── */

export function normalizeDashboardSummary(
  raw: DashboardSummary | null | undefined,
): DashboardSummary {
  const d = safeObject<any>(raw);
  return {
    projectCount: safeNumber(d.projectCount),
    projectStatusSummary: safeObject(d.projectStatusSummary),
    taskCount: safeNumber(d.taskCount),
    completedTaskCount: safeNumber(d.completedTaskCount),
    overdueTaskCount: safeNumber(d.overdueTaskCount),
    memberCount: safeNumber(d.memberCount),
  } as DashboardSummary;
}

export function normalizeMilestones(
  raw: DashboardMilestone[] | null | undefined,
): DashboardMilestone[] {
  return safeArray<DashboardMilestone>(raw);
}

export function normalizeRisks(
  raw: DashboardRisksResponse | null | undefined,
): DashboardRisksResponse {
  const d = safeObject<any>(raw);
  return {
    count: safeNumber(d.count),
    items: safeArray(d.items),
  } as DashboardRisksResponse;
}

export function normalizeHealth(
  raw: WorkspaceHealthData | null | undefined,
): WorkspaceHealthData | null {
  if (!raw) return null;
  const d = safeObject<any>(raw);
  const exec = safeObject<any>(d.executionSummary);
  const counts = safeObject<any>(exec.counts);
  return {
    ...d,
    executionSummary: {
      counts: {
        activeProjects: safeNumber(counts.activeProjects),
        totalWorkItems: safeNumber(counts.totalWorkItems),
        overdueWorkItems: safeNumber(counts.overdueWorkItems),
        dueSoon7Days: safeNumber(counts.dueSoon7Days),
      },
      topOverdue: safeArray(exec.topOverdue),
      recentActivity: safeArray(exec.recentActivity),
    },
  } as WorkspaceHealthData;
}

export function normalizeSummary(
  raw: WorkspaceSummary | null | undefined,
): WorkspaceSummary | null {
  if (!raw) return null;
  return raw;
}
