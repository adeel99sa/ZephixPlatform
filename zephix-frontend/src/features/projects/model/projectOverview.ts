/**
 * Shared project overview payload shape (GET /work/projects/:id/overview).
 * Used by ProjectPageLayout (identity frame) and ProjectOverviewTab.
 */

export interface NeedsAttentionItem {
  typeCode: string;
  reasonText: string;
  ownerUserId: string | null;
  nextStepCode: string;
  nextStepLabel: string;
  entityRef: {
    taskId?: string;
    phaseId?: string;
  };
  dueDate?: string;
}

export interface ProjectOverview {
  projectId: string;
  projectName: string;
  projectState: string;
  structureLocked: boolean;
  startedAt: string | null;
  deliveryOwnerUserId: string | null;
  dateRange: {
    startDate: string | null;
    dueDate: string | null;
  };
  healthCode: 'HEALTHY' | 'AT_RISK' | 'BLOCKED';
  healthLabel: string;
  behindTargetDays: number | null;
  needsAttention: NeedsAttentionItem[];
  nextActions: NeedsAttentionItem[];
}

export function overviewActionItemKey(item: NeedsAttentionItem): string {
  return (
    item.entityRef?.taskId ??
    `${item.typeCode}:${item.reasonText}:${item.nextStepLabel}`
  );
}

export function normalizeProjectOverview(payload: unknown): ProjectOverview | null {
  if (!payload || typeof payload !== 'object') return null;
  const raw = payload as Partial<ProjectOverview>;
  return {
    projectId: raw.projectId ?? '',
    projectName: raw.projectName ?? '',
    projectState: raw.projectState ?? 'DRAFT',
    structureLocked: Boolean(raw.structureLocked),
    startedAt: raw.startedAt ?? null,
    deliveryOwnerUserId: raw.deliveryOwnerUserId ?? null,
    dateRange: {
      startDate: raw.dateRange?.startDate ?? null,
      dueDate: raw.dateRange?.dueDate ?? null,
    },
    healthCode: raw.healthCode ?? 'HEALTHY',
    healthLabel: raw.healthLabel ?? 'Healthy',
    behindTargetDays: raw.behindTargetDays ?? null,
    needsAttention: Array.isArray(raw.needsAttention) ? raw.needsAttention : [],
    nextActions: Array.isArray(raw.nextActions) ? raw.nextActions : [],
  };
}
