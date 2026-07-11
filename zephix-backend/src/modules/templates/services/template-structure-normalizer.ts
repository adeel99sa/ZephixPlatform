/**
 * Phase 5A.3 — Canonical template structure normalizer.
 *
 * Single source of truth for converting any current Template storage shape
 * into the nested phase+task structure that the action flow (preview and
 * instantiate-v5_1) expects.
 *
 * Background — see learning report:
 *   - Two write paths exist for templates:
 *     1. seed-system-templates.ts (SYSTEM templates)
 *     2. projects.service.ts saveProjectAsTemplate (WORKSPACE templates)
 *   - Both write to FLAT columns: `template.phases` + `template.taskTemplates`.
 *   - Neither writes to the legacy nested `template.structure` column.
 *   - Before this normalizer existed, two private extractTemplateStructure
 *     copies in preview-v5_1 and instantiate-v5_1 ONLY read `template.structure`
 *     and returned null for every Phase 5A SYSTEM template + every Phase 4
 *     saved template.
 *   - That mismatch was the root cause of "Template must have at least one
 *     phase" on Use Template, and of empty Preview modals.
 *
 * Contract:
 *   - Input: a current Template entity (or a row shaped like one)
 *   - Output: a normalized nested structure for the action flow,
 *             OR null if there is no usable phase data on either path
 *
 * Rules:
 *   1. If `structure.phases` is a non-empty array → use the structure path
 *      (preserves forward compatibility for future templates that may
 *      explicitly populate the nested column).
 *   2. Otherwise, if `phases` is a non-empty array → build the nested
 *      structure from `phases` + `taskTemplates` by joining
 *      `taskTemplates[].phaseOrder === phases[].order`.
 *   3. Otherwise, return null. The caller throws a real validation error.
 *      No fake fallback phase. No silent empty success.
 *
 * The two callers (preview-v5_1, instantiate-v5_1) MUST use this helper
 * directly. There must be no private duplicate of this logic.
 */

/** A flat phase row as written by seeder + saveProjectAsTemplate. */
export interface FlatTemplatePhase {
  name: string;
  description?: string;
  order: number;
  estimatedDurationDays?: number;
  reportingKey?: string;
  isMilestone?: boolean;
  dueDate?: string;
  /**
   * TC-B4: canonical platform.gate.* key for a phase gate. When present,
   * instantiate creates a project-scoped phase_gate_definitions row wired to
   * the created WorkPhase, arming W2 governance the moment a profile attaches.
   */
  gateKey?: string;
  /**
   * TC-B6: catalog document keys bundled into this phase. When present,
   * instantiate materializes a document_instance per key (phaseKey =
   * reportingKey), and save-as-template serializes them back. Structure only —
   * never content or versions (snapshot rules).
   */
  docKeys?: string[];
}

/** A flat task row as written by seeder + saveProjectAsTemplate. */
export interface FlatTemplateTask {
  name: string;
  description?: string;
  estimatedHours?: number;
  phaseOrder?: number;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  /** TC-B5: optional tags applied to the instantiated work_tasks.tags. */
  tags?: string[];
  /**
   * TC-C1b: stable key identifying this task within the template, used as the
   * anchor for {@link dependsOn} and {@link parentKey} references. Preferred
   * over array indices so save/instantiate round-trips survive reordering.
   */
  key?: string;
  /**
   * TC-C1b (F1): keys of tasks this task depends on (predecessors). Each
   * becomes a work_task_dependencies row (predecessor -> this, FS). The
   * template's full dependency graph is cycle-checked at instantiate.
   */
  dependsOn?: string[];
  /**
   * TC-C1b (F3): key of this task's parent. Instantiate sets
   * work_tasks.parent_task_id after all tasks are created (two-pass).
   */
  parentKey?: string;
  /**
   * TC-B7 (D3): relative Gantt dates. startDate = anchor + startOffsetDays;
   * dueDate = startDate + durationDays. Anchor = the flow's project start date
   * (or today if absent). Absent offsets → no dates (current behavior).
   */
  startOffsetDays?: number;
  durationDays?: number;
  /**
   * TC-C1 (F2): when true, the instantiated work_task is a milestone
   * (work_tasks.is_milestone). Passthrough mirrors {@link tags}.
   */
  isMilestone?: boolean;
  /**
   * TC-C1 (F5): story points applied to work_tasks.estimate_points.
   * Passthrough mirrors {@link tags}.
   */
  storyPoints?: number;
  /**
   * Phase 11 (2026-04-08) — initial status hint for the seeded task.
   * When set, the instantiation service uses this value as the
   * created task's status (after enum validation in the WorkTasksService
   * create flow). When unset, the task defaults to TODO. Status hints
   * let templates ship with realistic mid-project state so phase
   * rollups (Progress Auto column) and dashboard cards have meaningful
   * data the moment a project is instantiated.
   */
  status?:
    | 'BACKLOG'
    | 'TODO'
    | 'IN_PROGRESS'
    | 'BLOCKED'
    | 'IN_REVIEW'
    | 'DONE'
    | 'CANCELED';
}

/**
 * The output shape consumed by both preview-v5_1 and instantiate-v5_1.
 *
 * Field names match what the legacy `extractTemplateStructure` returned
 * (sortOrder, isMilestone, tasks[]) so existing downstream consumers
 * (WorkPhase / WorkTask creation, lock-policy resolution, etc.) keep
 * working without re-mapping.
 */
export interface NormalizedTemplateStructure {
  phases: Array<{
    name: string;
    sortOrder: number;
    reportingKey?: string;
    isMilestone: boolean;
    dueDate?: string;
    gateKey?: string; // TC-B4: canonical platform.gate.* key, if the phase gates.
    docKeys?: string[]; // TC-B6: catalog doc keys bundled onto this phase.
    tasks: Array<{
      title: string;
      sortOrder: number;
      description?: string;
      status?: string;
      priority?: string;
      tags?: string[]; // TC-B5
      isMilestone?: boolean; // TC-C1 (F2)
      storyPoints?: number; // TC-C1 (F5)
      key?: string; // TC-C1b
      dependsOn?: string[]; // TC-C1b (F1)
      parentKey?: string; // TC-C1b (F3)
      startOffsetDays?: number; // TC-B7 (D3)
      durationDays?: number; // TC-B7 (D3)
    }>;
  }>;
}

/**
 * Product policy (2026-04): templates ship phase shells + methodology/config
 * (like ClickUp statuses/views), not a pre-filled WBS. PMs add tasks,
 * milestones, and extra phases in **Project Activities** after apply.
 *
 * When false, {@link normalizeTemplateStructure} clears `tasks` on every phase
 * after join — preview + instantiate-v5_1 see empty task lists. Legacy SQL
 * task inserts are gated separately via {@link INSTANTIATE_LEGACY_TEMPLATE_TASK_ROWS}.
 */
export const INSTANTIATE_TEMPLATE_SEED_TASKS = true;

/** Legacy `tasks` table path in TemplatesService (non–work-management). */
export const INSTANTIATE_LEGACY_TEMPLATE_TASK_ROWS = false;

/**
 * Minimum subset of Template the normalizer needs. Keeping the input
 * loose-typed makes the helper trivially testable and lets the preview
 * service pass a raw-SQL row in without faking a full Template entity.
 */
export interface NormalizableTemplate {
  structure?: Record<string, any> | null;
  phases?: FlatTemplatePhase[] | Record<string, any> | null;
  taskTemplates?: FlatTemplateTask[] | Record<string, any> | null;
  /** Some preview paths use snake_case off raw SQL. */
  task_templates?: FlatTemplateTask[] | Record<string, any> | null;
}

/**
 * PostgreSQL JSONB arrays sometimes come back as objects with numeric
 * string keys when the upstream column was a JSONB array literal. This
 * coerces both shapes to a real JS array. Returns [] for any other input.
 */
function coerceJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object') {
    const numericKeys = Object.keys(value as Record<string, unknown>)
      .filter((k) => /^\d+$/.test(k))
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    if (numericKeys.length > 0) {
      return numericKeys.map((k) => (value as Record<string, unknown>)[k] as T);
    }
  }
  return [];
}

/**
 * Path 1: when `structure.phases` is present and non-empty, use it directly.
 * Preserves forward compatibility with any future template that explicitly
 * populates the nested structure column.
 */
function normalizeFromStructure(
  structure: Record<string, any>,
): NormalizedTemplateStructure | null {
  const rawPhases = coerceJsonArray<any>(structure.phases);
  if (rawPhases.length === 0) return null;

  const phases = rawPhases.map((phase: any) => {
    const sortOrder =
      phase.order !== undefined
        ? Number(phase.order)
        : phase.sortOrder !== undefined
          ? Number(phase.sortOrder)
          : 0;
    const tasks = coerceJsonArray<any>(phase.tasks).map(
      (task: any, taskIndex: number) => ({
        title: task.name || task.title || `Task ${taskIndex + 1}`,
        sortOrder:
          task.sortOrder !== undefined ? Number(task.sortOrder) : taskIndex,
        description: task.description ?? undefined,
        status: task.status ?? undefined,
        priority: task.priority ?? undefined,
        tags: Array.isArray(task.tags) ? task.tags : undefined, // TC-B5
        isMilestone: task.isMilestone === true ? true : undefined, // TC-C1 (F2)
        storyPoints:
          typeof task.storyPoints === 'number' ? task.storyPoints : undefined, // TC-C1 (F5)
        key: typeof task.key === 'string' ? task.key : undefined, // TC-C1b
        dependsOn: Array.isArray(task.dependsOn) ? task.dependsOn : undefined, // TC-C1b (F1)
        parentKey:
          typeof task.parentKey === 'string' ? task.parentKey : undefined, // TC-C1b (F3)
        startOffsetDays:
          typeof task.startOffsetDays === 'number'
            ? task.startOffsetDays
            : undefined, // TC-B7 (D3)
        durationDays:
          typeof task.durationDays === 'number' ? task.durationDays : undefined, // TC-B7 (D3)
      }),
    );
    return {
      name: phase.name || `Phase ${sortOrder}`,
      sortOrder,
      reportingKey: phase.reportingKey ?? undefined,
      isMilestone: phase.isMilestone === true,
      dueDate: phase.dueDate ?? undefined,
      gateKey: phase.gateKey ?? undefined,
      docKeys: Array.isArray(phase.docKeys) ? phase.docKeys : undefined, // TC-B6
      tasks,
    };
  });

  return { phases };
}

/**
 * Path 2: when the nested structure is missing or empty, build the nested
 * structure from the flat `phases` + `taskTemplates` columns by joining
 * tasks to phases via phaseOrder === phase.order.
 */
function normalizeFromFlat(
  flatPhasesInput: unknown,
  flatTasksInput: unknown,
): NormalizedTemplateStructure | null {
  const flatPhases = coerceJsonArray<FlatTemplatePhase>(flatPhasesInput);
  if (flatPhases.length === 0) return null;

  const flatTasks = coerceJsonArray<FlatTemplateTask>(flatTasksInput);

  // Group tasks by phaseOrder. Tasks with no phaseOrder are dropped — the
  // flat schema requires phaseOrder to anchor a task to a phase, and a
  // null-anchor task cannot deterministically be placed.
  const tasksByPhaseOrder = new Map<number, FlatTemplateTask[]>();
  for (const t of flatTasks) {
    if (typeof t.phaseOrder !== 'number') continue;
    const list = tasksByPhaseOrder.get(t.phaseOrder) ?? [];
    list.push(t);
    tasksByPhaseOrder.set(t.phaseOrder, list);
  }

  const phases = flatPhases
    .slice()
    .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
    .map((phase) => {
      const sortOrder = Number(phase.order ?? 0);
      const matchingTasks = tasksByPhaseOrder.get(sortOrder) ?? [];
      const tasks = matchingTasks.map((task, taskIndex) => ({
        title: task.name || `Task ${taskIndex + 1}`,
        sortOrder: taskIndex,
        description: task.description ?? undefined,
        tags: Array.isArray(task.tags) ? task.tags : undefined, // TC-B5
        isMilestone: task.isMilestone === true ? true : undefined, // TC-C1 (F2)
        storyPoints:
          typeof task.storyPoints === 'number' ? task.storyPoints : undefined, // TC-C1 (F5)
        key: typeof task.key === 'string' ? task.key : undefined, // TC-C1b
        dependsOn: Array.isArray(task.dependsOn) ? task.dependsOn : undefined, // TC-C1b (F1)
        parentKey:
          typeof task.parentKey === 'string' ? task.parentKey : undefined, // TC-C1b (F3)
        startOffsetDays:
          typeof task.startOffsetDays === 'number'
            ? task.startOffsetDays
            : undefined, // TC-B7 (D3)
        durationDays:
          typeof task.durationDays === 'number' ? task.durationDays : undefined, // TC-B7 (D3)
        // Phase 11 (2026-04-08) — pass through the status hint from
        // the flat template format. Previously hardcoded as undefined,
        // which silently dropped any seeded status from the SYSTEM
        // template definitions. With the hint preserved, fresh
        // instantiations of pm_waterfall_v2 ship with realistic
        // mid-project state (some DONE, some IN_PROGRESS, some TODO)
        // so phase completion rollups and dashboard cards populate
        // immediately.
        status: task.status ?? undefined,
        priority: task.priority ?? undefined,
      }));
      return {
        name: phase.name || `Phase ${sortOrder}`,
        sortOrder,
        reportingKey: phase.reportingKey ?? undefined,
        isMilestone: phase.isMilestone === true,
        dueDate: phase.dueDate ?? undefined,
        gateKey: phase.gateKey ?? undefined,
        docKeys: Array.isArray(phase.docKeys) ? phase.docKeys : undefined, // TC-B6
        tasks,
      };
    });

  return { phases };
}

export type NormalizeTemplateStructureOptions = {
  /**
   * When true, preserves joined nested tasks (for unit tests and tooling).
   * Default follows {@link INSTANTIATE_TEMPLATE_SEED_TASKS}.
   */
  includeSeedTasks?: boolean;
};

/**
 * Canonical entry point used by both preview-v5_1 and instantiate-v5_1.
 *
 * Returns a normalized nested phase+task structure if the template has
 * usable phase data on EITHER storage path. Returns null if both paths
 * are empty or missing — the caller is responsible for throwing a real
 * VALIDATION_ERROR rather than producing fake data.
 */
export function normalizeTemplateStructure(
  template: NormalizableTemplate | null | undefined,
  options?: NormalizeTemplateStructureOptions,
): NormalizedTemplateStructure | null {
  if (!template) return null;

  const includeSeedTasks =
    options?.includeSeedTasks !== undefined
      ? options.includeSeedTasks
      : INSTANTIATE_TEMPLATE_SEED_TASKS;

  // Path 1 — explicit structure.phases (legacy + future)
  if (template.structure && typeof template.structure === 'object') {
    const fromStructure = normalizeFromStructure(template.structure);
    if (fromStructure && fromStructure.phases.length > 0) {
      return includeSeedTasks
        ? fromStructure
        : stripPhaseTasks(fromStructure);
    }
  }

  // Path 2 — flat phases + taskTemplates (current Phase 4+ canonical storage)
  // Accept both camelCase (entity) and snake_case (raw SQL row) for tasks.
  const flatTasks = template.taskTemplates ?? template.task_templates ?? [];
  const fromFlat = normalizeFromFlat(template.phases, flatTasks);
  if (fromFlat && fromFlat.phases.length > 0) {
    return includeSeedTasks ? fromFlat : stripPhaseTasks(fromFlat);
  }

  return null;
}

function stripPhaseTasks(
  s: NormalizedTemplateStructure,
): NormalizedTemplateStructure {
  return {
    phases: s.phases.map((p) => ({ ...p, tasks: [] })),
  };
}
