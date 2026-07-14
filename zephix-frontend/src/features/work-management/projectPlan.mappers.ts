import type { AttributeDataType, AttributeDefinition } from '@/features/attributes/attributes.types';

import type {
  ProjectPlan,
  ProjectPlanCapabilities,
  WorkPhase,
  WorkPlanPhaseGate,
  WorkPlanTaskAttribute,
} from './workTasks.api';

export type PlanAttributeColumn = {
  definitionId: string;
  key: string;
  label: string;
  isLocked: boolean;
  displayOrder: number;
};

function readBool(raw: Record<string, unknown>, key: string): boolean | undefined {
  const val = raw[key];
  return typeof val === 'boolean' ? val : undefined;
}

function normalizeGate(raw: unknown): WorkPlanPhaseGate | null {
  if (raw == null) return null;
  if (typeof raw !== 'object') return null;
  const g = raw as Record<string, unknown>;
  return {
    definitionExists: Boolean(g.definitionExists ?? g.definition_exists ?? false),
    submissionStatus:
      g.submissionStatus != null
        ? (String(g.submissionStatus ?? g.submission_status) as WorkPlanPhaseGate['submissionStatus'])
        : g.submission_status != null
          ? (String(g.submission_status) as WorkPlanPhaseGate['submissionStatus'])
          : null,
    evaluation: null,
  };
}

function normalizeAttribute(raw: unknown): WorkPlanTaskAttribute | null {
  if (!raw || typeof raw !== 'object') return null;
  const a = raw as Record<string, unknown>;
  const definitionId = String(a.definitionId ?? a.definition_id ?? '');
  if (!definitionId) return null;
  return {
    definitionId,
    key: String(a.key ?? ''),
    label: String(a.label ?? a.key ?? ''),
    value: a.value ?? null,
    isLocked: Boolean(a.isLocked ?? a.is_locked ?? false),
    dataType: (a.dataType ?? a.data_type) as AttributeDataType | undefined,
    displayOrder:
      typeof a.displayOrder === 'number'
        ? a.displayOrder
        : typeof a.display_order === 'number'
          ? a.display_order
          : undefined,
  };
}

function normalizeCapabilities(raw: unknown): ProjectPlanCapabilities | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const c = raw as Record<string, unknown>;
  return {
    use_phases: readBool(c, 'use_phases') ?? readBool(c, 'usePhases') ?? true,
    use_iterations: readBool(c, 'use_iterations') ?? readBool(c, 'useIterations') ?? false,
    use_gates: readBool(c, 'use_gates') ?? readBool(c, 'useGates') ?? true,
    use_wip_limits: readBool(c, 'use_wip_limits') ?? readBool(c, 'useWipLimits') ?? false,
  };
}

/**
 * OV-1 / A3 — live governance proof from GET /work/projects/:id/plan.
 * True only when at least one phase has an ACTIVE gate definition (`definitionExists`).
 * Template inheritance alone is not sufficient.
 */
export function projectHasActiveGateDefinitions(
  plan: Pick<ProjectPlan, 'phases'> | null | undefined,
): boolean {
  if (!plan?.phases?.length) return false;
  return plan.phases.some((phase) => phase.gate?.definitionExists === true);
}

/** Normalize GET /work/projects/:id/plan — accepts camelCase or snake_case. */
export function mapProjectPlanFromApi(raw: unknown): ProjectPlan {
  const p = (raw ?? {}) as Record<string, unknown>;
  const phasesRaw = (p.phases ?? []) as unknown[];

  const phases: WorkPhase[] = phasesRaw.map((phaseRaw) => {
    const ph = (phaseRaw ?? {}) as Record<string, unknown>;
    const tasksRaw = (ph.tasks ?? []) as unknown[];
    return {
      id: String(ph.id ?? ''),
      name: String(ph.name ?? ''),
      sortOrder: Number(ph.sortOrder ?? ph.sort_order ?? 0),
      reportingKey: String(ph.reportingKey ?? ph.reporting_key ?? ''),
      isMilestone: Boolean(ph.isMilestone ?? ph.is_milestone ?? false),
      isLocked: Boolean(ph.isLocked ?? ph.is_locked ?? false),
      dueDate: ph.dueDate != null ? String(ph.dueDate) : ph.due_date != null ? String(ph.due_date) : null,
      gate: normalizeGate(ph.gate),
      tasks: tasksRaw.map((taskRaw) => {
        const t = (taskRaw ?? {}) as Record<string, unknown>;
        const attrsRaw = (t.attributes ?? []) as unknown[];
        return {
          id: String(t.id ?? ''),
          title: String(t.title ?? ''),
          status: (t.status ?? 'TODO') as WorkPhase['tasks'][number]['status'],
          rank: t.rank != null ? Number(t.rank) : t.sortOrder != null ? Number(t.sortOrder) : undefined,
          ownerId:
            t.ownerId != null
              ? String(t.ownerId)
              : t.owner_id != null
                ? String(t.owner_id)
                : null,
          dueDate: t.dueDate != null ? String(t.dueDate) : t.due_date != null ? String(t.due_date) : null,
          attributes: attrsRaw
            .map(normalizeAttribute)
            .filter((a): a is WorkPlanTaskAttribute => a != null),
        };
      }),
    };
  });

  return {
    projectId: String(p.projectId ?? p.project_id ?? ''),
    projectName: String(p.projectName ?? p.project_name ?? ''),
    projectState: String(p.projectState ?? p.project_state ?? 'DRAFT'),
    structureLocked: Boolean(p.structureLocked ?? p.structure_locked ?? false),
    capabilities: normalizeCapabilities(p.capabilities),
    phases,
  };
}

function inferDataType(value: unknown): AttributeDataType {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (Array.isArray(value)) return 'multi_select';
  return 'text';
}

export function planAttributeToDefinition(attr: WorkPlanTaskAttribute): AttributeDefinition {
  const dataType: AttributeDataType = attr.dataType
    ? (attr.dataType as AttributeDataType)
    : inferDataType(attr.value);
  return {
    id: attr.definitionId,
    organizationId: null,
    scope: 'SYSTEM' as const,
    workspaceId: null,
    key: attr.key,
    label: attr.label,
    dataType,
    locked: attr.isLocked,
    required: false,
    isActive: true,
    defaultValue: null,
    options: null,
  };
}

/** Table-level union of attribute columns across all tasks (respect display_order). */
export function collectPlanAttributeColumns(phases: WorkPhase[]): PlanAttributeColumn[] {
  const byId = new Map<string, PlanAttributeColumn>();

  for (const phase of phases) {
    for (const task of phase.tasks) {
      for (const attr of task.attributes ?? []) {
        const order = attr.displayOrder ?? Number.MAX_SAFE_INTEGER;
        const existing = byId.get(attr.definitionId);
        if (!existing || order < existing.displayOrder) {
          byId.set(attr.definitionId, {
            definitionId: attr.definitionId,
            key: attr.key,
            label: attr.label,
            isLocked: attr.isLocked,
            displayOrder: order,
          });
        } else if (existing && attr.isLocked) {
          existing.isLocked = true;
        }
      }
    }
  }

  return [...byId.values()].sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
    return a.label.localeCompare(b.label);
  });
}

export function taskAttributeValue(
  task: WorkPhase['tasks'][number],
  definitionId: string,
): unknown {
  return task.attributes?.find((a) => a.definitionId === definitionId)?.value ?? null;
}
