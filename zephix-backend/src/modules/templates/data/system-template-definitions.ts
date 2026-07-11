/**
 * Wave 7: System template definitions — 12 templates, 3 per delivery method.
 *
 * This is the single source of truth for system template content.
 * Used by both the seed script and the test suite.
 * No runtime dependencies — pure data only.
 */

/**
 * Phase 5A: project-template categories.
 *
 * Five fixed top-level categories drive the Template Center left rail.
 * Every system template definition MUST set one of these five values.
 * Frontend imports the same union from `features/templates/categories.ts`.
 */
export type ProjectTemplateCategory =
  | 'Project Management'
  | 'Product Management'
  | 'Software Development'
  | 'Operations'
  | 'Startups';

/**
 * Runtime companion to {@link ProjectTemplateCategory}. Used to validate
 * caller-supplied categories (e.g. save-as-template). Keep in sync with the
 * union above and the frontend `features/templates/categories.ts`.
 */
export const PROJECT_TEMPLATE_CATEGORIES: readonly ProjectTemplateCategory[] = [
  'Project Management',
  'Product Management',
  'Software Development',
  'Operations',
  'Startups',
] as const;

/** Fallback category applied when a save-as-template caller omits one. */
export const DEFAULT_TEMPLATE_CATEGORY = 'custom' as const;

/** True when `value` is one of the five fixed catalog categories. */
export function isValidTemplateCategory(
  value: string,
): value is ProjectTemplateCategory {
  return (PROJECT_TEMPLATE_CATEGORIES as readonly string[]).includes(value);
}

/**
 * TC-B5: build the stored template columnConfig, merging the def's `defaultView`
 * (which view opens first) into the JSONB blob. instantiate spreads this onto
 * project.columnConfig; enabledViews live separately in `default_tabs`.
 */
export function buildTemplateColumnConfig(def: {
  columnConfig?: Record<string, boolean | string[]>;
  defaultView?: string;
}): Record<string, unknown> | null {
  const base = def.columnConfig ?? undefined;
  if (!base && !def.defaultView) return null;
  return {
    ...(base ?? {}),
    ...(def.defaultView ? { defaultView: def.defaultView } : {}),
  };
}

/**
 * Phase 5B.1 — Default column set declared at template level.
 *
 * Waterfall (pm_waterfall_v2) is the first template to declare an explicit
 * column set. Other templates may omit this; the work surface will fall back
 * to its generic column rendering.
 *
 * Phase 1 (2026-04-08) — extended to support the locked 8 default columns
 * plus a hidden-but-included pool. Replaces the original 11-column set
 * (which mixed defaults and opt-ins). The new model:
 *
 *   defaultColumns: the 8 locked-visible columns the template ships with.
 *   hiddenColumns:  fields present in the data model and revealable via the
 *                   column picker, but NOT visible by default.
 *
 * The legacy keys (`owner`, `priority`, `milestone`, `dependency`,
 * `approvalStatus`, `documentRequired`) remain in the union so existing
 * persisted definitions and the frontend column picker continue to resolve.
 * `owner` is a deprecated alias for `assignee`; `assignee` is the canonical
 * key going forward.
 */
export type WaterfallDefaultColumnKey =
  // ── Canonical 8 default columns (Phase 1 lock 2026-04-08) ──────────
  | 'title'
  | 'assignee'
  | 'status'
  | 'startDate'
  | 'dueDate'
  | 'completion'
  | 'duration'
  | 'remarks'
  // ── Hidden / opt-in columns (data exists, not shown by default) ────
  | 'priority'
  | 'milestone'
  | 'dependency'
  | 'approvalStatus'
  | 'documentRequired'
  | 'description'
  | 'tags'
  | 'dateCreated'
  | 'dateDone'
  // ── Deprecated alias kept for backwards compatibility ──────────────
  | 'owner';

export interface SystemTemplateDef {
  name: string;
  code: string;
  description: string;
  /** Phase 5A: one-line "purpose" copy for the template card body. */
  purpose: string;
  /** Phase 5A: Template Center category bucket. */
  category: ProjectTemplateCategory;
  // TC-B2 / AD-029: canonical vocabulary (agile folded into scrum, T6 merge).
  // TC-C1: null allowed for methodology-agnostic Starter templates (T1, T5).
  methodology: 'scrum' | 'waterfall' | 'kanban' | 'hybrid' | null;
  /** @deprecated DEPRECATED-AD029 — retained for reference only; not written to templates rows. */
  deliveryMethod: string;
  packCode: string;
  workTypeTags: string[];
  defaultTabs: string[];
  defaultGovernanceFlags: Record<string, boolean>;
  /**
   * Phase 5B.1 — locked column set for the row-and-column work surface.
   * Optional: only Waterfall declares this in 5B.1.
   */
  defaultColumns?: WaterfallDefaultColumnKey[];
  /**
   * Phase 1 (2026-04-08) — columns present in the data model but hidden
   * by default. Surfaced in the Fields panel under "Hidden" with a toggle
   * so end-users can opt them into the visible column set per project.
   * Toggling on inserts the column alphabetically into the visible set.
   */
  hiddenColumns?: WaterfallDefaultColumnKey[];
  /**
   * Phase 1 (2026-04-08) — phase color palette keyed by `reportingKey`.
   * Used by the new render to draw the phase color dot, tint the phase
   * progress bar, and accent the phase header. Future templates each ship
   * their own palette in their JSON definition.
   */
  phaseColors?: Record<string, string>;
  /**
   * Phase 1 (2026-04-08) — explicit status→bucket assignment for this
   * template. Buckets are the durable contract for governance, completion
   * rollups, and view filters. Status names are renameable labels;
   * bucket assignment survives renaming. Strings are TaskStatus enum
   * values; declared as `string[]` here to avoid an import cycle into
   * the work-management module.
   */
  statusBuckets?: {
    not_started: string[];
    active: string[];
    closed: string[];
  };
  /**
   * Phase 5B.1 — preview-only "best for" line shown in the summary preview.
   */
  bestFor?: string;
  /**
   * Phase 5B.1 — preview-only required-artifact list shown in the summary preview.
   * Display-only; does NOT create a real artifact requirement engine in 5B.1.
   */
  requiredArtifacts?: string[];
  /**
   * Phase 5B.1 — preview-only governance toggle list. Surfaces what an Org
   * Admin *could* enable later. Does NOT activate any rule in 5B.1.
   */
  governanceOptions?: string[];
  /**
   * Phase 5B.1 — list of canonical view names included with this template
   * (e.g. "Table", "Board"). Display-only; does not create views.
   */
  includedViews?: string[];
  /**
   * P-2: Tier 2 column defaults. Keys map to column identifiers in the
   * gear icon panel. true = ON by default, false = available but OFF.
   * Tier 1 columns (taskName, status, assignee, dates, priority, completion,
   * description) are always visible and not listed here.
   */
  columnConfig?: Record<string, boolean | string[]>;
  /**
   * TC-B5: which enabled view opens first (e.g. 'tasks' for Table, 'board').
   * Merged into the stored template columnConfig as `defaultView` at seed time;
   * instantiate carries it onto project.columnConfig. enabledViews = defaultTabs.
   * (Frontend honoring of view config is TC-F work; backend stores + round-trips.)
   */
  defaultView?: string;
  phases: Array<{
    name: string;
    description: string;
    order: number;
    estimatedDurationDays: number;
    /** When true, instantiated as a milestone phase (reporting / gate). */
    isMilestone?: boolean;
    /** Optional stable key for reporting (e.g. REQ, DESIGN). */
    reportingKey?: string;
    /**
     * TC-B4: canonical platform.gate.* key for this phase's gate. When set,
     * instantiate creates a project-scoped phase_gate_definitions row, arming
     * W2 governance the moment a profile attaches (blueprint T7).
     */
    gateKey?: string;
    /**
     * TC-B6: catalog document keys bundled into this phase. On instantiate,
     * each becomes a document_instance (resolved version 1) anchored to the
     * phase (blueprint T7).
     */
    docKeys?: string[];
  }>;
  /**
   * Per-template status set seeded into `project_statuses` on
   * instantiation. Each entry becomes one row tied to the new project.
   * `bucket` drives governance/rollup logic and must be one of
   * `open | done | cancelled`. Templates that omit this field fall back
   * to the seven default rows in `ProjectStatusService.seedFromTemplate`.
   */
  statusGroups?: Array<{
    statusKey: string;
    displayName: string;
    color: string;
    order: number;
    bucket: 'open' | 'done' | 'cancelled';
    isDefault?: boolean;
  }>;
  taskTemplates: Array<{
    name: string;
    description: string;
    estimatedHours: number;
    phaseOrder: number;
    priority: 'low' | 'medium' | 'high' | 'critical';
    /**
     * Phase 11 (2026-04-08) — Optional initial status for the seeded
     * task. When omitted the task is created in TODO. When set, the
     * normalizer (`normalizeFromFlat`) passes the value through to
     * the instantiation service, which writes it as the WorkTask's
     * `status` column. Used to ship templates with realistic
     * mid-project state — e.g. early phases mostly DONE so the phase
     * completion rollup looks like a real running project.
     */
    status?:
      | 'BACKLOG'
      | 'TODO'
      | 'IN_PROGRESS'
      | 'BLOCKED'
      | 'IN_REVIEW'
      | 'DONE'
      | 'CANCELED';
    /** TC-B5: tags materialized onto work_tasks.tags. */
    tags?: string[];
    /** TC-C1 (F2): when true, instantiate marks the task a milestone. */
    isMilestone?: boolean;
    /** TC-C1 (F5): story points → work_tasks.estimate_points. */
    storyPoints?: number;
    /** TC-C1b: stable key anchoring dependsOn/parentKey references. */
    key?: string;
    /** TC-C1b (F1): keys of predecessor tasks → work_task_dependencies (FS). */
    dependsOn?: string[];
    /** TC-C1b (F3): parent task key → work_tasks.parent_task_id. */
    parentKey?: string;
  }>;
  /**
   * TC-C1: Setup-effort badge surfaced in the Template Center card
   * (metadata.setup). One of 'Simple' | 'Standard' | 'Advanced'.
   */
  setup?: 'Simple' | 'Standard' | 'Advanced';
  /**
   * TC-C1b (F4): custom attribute fields this template ships (e.g. a
   * "Sprint-ready?" checkbox, a "Type" dropdown). Seeded as SYSTEM-scoped
   * attribute_definitions (idempotent by scope+key) + a template_attribute_
   * definitions attachment; instantiate's AD-016 copy-down then materializes a
   * project_attribute_definitions row. `dataType` uses the AttributeDataType
   * vocabulary ('boolean' | 'single_select' | 'text' | 'number' | ...);
   * `options` supplies select values, e.g. { values: ['Feature','Bug'] }.
   */
  customAttributes?: Array<{
    key: string;
    label: string;
    dataType: string;
    options?: Record<string, unknown>;
    defaultValue?: string;
    required?: boolean;
  }>;
  riskPresets?: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
}

// ── Shared governance flag sets ──────────────────────────────────────

const SCRUM_GOV = {
  iterationsEnabled: true,
  costTrackingEnabled: false,
  baselinesEnabled: false,
  earnedValueEnabled: false,
  capacityEnabled: false,
  changeManagementEnabled: false,
  waterfallEnabled: false,
};

const KANBAN_GOV = {
  iterationsEnabled: false,
  costTrackingEnabled: false,
  baselinesEnabled: false,
  earnedValueEnabled: false,
  capacityEnabled: true,
  changeManagementEnabled: false,
  waterfallEnabled: false,
};

const WATERFALL_GOV = {
  iterationsEnabled: false,
  costTrackingEnabled: true,
  baselinesEnabled: true,
  earnedValueEnabled: true,
  capacityEnabled: true,
  changeManagementEnabled: true,
  waterfallEnabled: true,
};

const HYBRID_GOV = {
  iterationsEnabled: true,
  costTrackingEnabled: true,
  baselinesEnabled: false,
  earnedValueEnabled: false,
  capacityEnabled: true,
  changeManagementEnabled: true,
  waterfallEnabled: false,
};

// TC-C1: Starter tier ships governance OFF — beginners add rigor later.
const STARTER_GOV = {
  iterationsEnabled: false,
  costTrackingEnabled: false,
  baselinesEnabled: false,
  earnedValueEnabled: false,
  capacityEnabled: false,
  changeManagementEnabled: false,
  waterfallEnabled: false,
};

// TC-C1: Starter Gantt/timeline needs the waterfall (phase/timeline) surface,
// but nothing heavier (no cost/baseline/EV).
const STARTER_GANTT_GOV = {
  ...STARTER_GOV,
  waterfallEnabled: true,
};

// TC-C1: Starter backlog turns iterations ON (the only governance a backlog
// beginner needs); everything else stays off.
const STARTER_BACKLOG_GOV = {
  ...STARTER_GOV,
  iterationsEnabled: true,
};

// ── P-2: Methodology-specific column defaults (Tier 2) ──────────────

const WATERFALL_COLUMNS: Record<string, boolean> = {
  phase: true,
  duration: true,
  milestone: true,
  dependency: true,
  remarks: true,
  sprint: false,
  storyPoints: false,
  epic: false,
  wipLimit: false,
  cycleTime: false,
  leadTime: false,
  labels: false,
};

const AGILE_COLUMNS: Record<string, boolean> = {
  phase: false,
  duration: false,
  milestone: false,
  dependency: false,
  remarks: false,
  sprint: true,
  storyPoints: true,
  epic: true,
  wipLimit: false,
  cycleTime: false,
  leadTime: false,
  labels: true,
};

const KANBAN_COLUMNS: Record<string, boolean> = {
  phase: false,
  duration: false,
  milestone: false,
  dependency: false,
  remarks: false,
  sprint: false,
  storyPoints: false,
  epic: false,
  wipLimit: true,
  cycleTime: true,
  leadTime: true,
  labels: true,
};

const HYBRID_COLUMNS: Record<string, boolean> = {
  phase: true,
  duration: true,
  milestone: true,
  dependency: true,
  remarks: false,
  sprint: true,
  storyPoints: true,
  epic: false,
  wipLimit: false,
  cycleTime: false,
  leadTime: false,
  labels: false,
};

// ── Phase 5A: 14 system project templates across 5 categories ────────

export const SYSTEM_TEMPLATE_DEFS: SystemTemplateDef[] = [
  /* ═══ PROJECT MANAGEMENT (4) ════════════════════════════════════════ */

  {
    name: 'Waterfall Project',
    code: 'pm_waterfall_v1',
    description:
      'Classic phased delivery: lock requirements and design before build, then test, deploy, and close. Mirrors common “Waterfall project” templates (properties + phased activities): scope and plan first, sequential execution, formal test/UAT, go-live and handover. Earned value, baselines, and change control stay on.',
    purpose:
      'Sequential phases from requirements through deployment—clear gates, milestone-friendly structure, ready for Gantt and status reporting.',
    category: 'Project Management',
    methodology: 'waterfall',
    deliveryMethod: 'WATERFALL',
    packCode: 'waterfall_evm',
    workTypeTags: ['waterfall', 'governance', 'baseline', 'evm', 'phase-gates', 'uat'],
    statusGroups: [
      { statusKey: 'BACKLOG',     displayName: 'Backlog',     color: '#888780', order: 0, bucket: 'open',      isDefault: false },
      { statusKey: 'TODO',        displayName: 'To Do',       color: '#B0B0B0', order: 1, bucket: 'open',      isDefault: true  },
      { statusKey: 'IN_PROGRESS', displayName: 'In Progress', color: '#185FA5', order: 2, bucket: 'open',      isDefault: false },
      { statusKey: 'BLOCKED',     displayName: 'Blocked',     color: '#E24B4A', order: 3, bucket: 'open',      isDefault: false },
      { statusKey: 'IN_REVIEW',   displayName: 'In Review',   color: '#534AB7', order: 4, bucket: 'open',      isDefault: false },
      { statusKey: 'DONE',        displayName: 'Done',        color: '#3B6D11', order: 5, bucket: 'done',      isDefault: false },
      { statusKey: 'CANCELED',    displayName: 'Cancelled',   color: '#888780', order: 6, bucket: 'cancelled', isDefault: false },
    ],
    defaultTabs: ['overview', 'plan', 'gantt', 'tasks', 'budget', 'change-requests', 'documents', 'kpis', 'risks', 'resources'],
    defaultGovernanceFlags: WATERFALL_GOV,
    columnConfig: WATERFALL_COLUMNS,
    phases: [
      {
        name: 'Requirements & scope',
        description:
          'Charter, stakeholders, requirements, and an approved scope baseline before design starts (requirements gate).',
        order: 0,
        estimatedDurationDays: 10,
        reportingKey: 'REQ',
      },
      {
        name: 'Design',
        description:
          'Solution architecture, detailed specifications, and planning artifacts that feed schedule and cost baselines.',
        order: 1,
        estimatedDurationDays: 14,
        reportingKey: 'DESIGN',
      },
      {
        name: 'Build',
        description:
          'Implementation, integration, and internal quality activities—execution against the baselined plan.',
        order: 2,
        estimatedDurationDays: 45,
        reportingKey: 'BUILD',
      },
      {
        name: 'Test & UAT',
        description:
          'QA cycles, defect remediation, user acceptance, and release readiness (test complete / UAT gate).',
        order: 3,
        estimatedDurationDays: 21,
        reportingKey: 'TEST',
        isMilestone: true,
      },
      {
        name: 'Deploy & close',
        description:
          'Production go-live, stabilization, training and handover, lessons learned, and formal acceptance.',
        order: 4,
        estimatedDurationDays: 10,
        reportingKey: 'CLOSE',
        isMilestone: true,
      },
    ],
    taskTemplates: [
      // Requirements & scope
      {
        name: 'Project charter & success criteria',
        description: 'Draft and approve charter, objectives, and measurable success criteria.',
        estimatedHours: 8,
        phaseOrder: 0,
        priority: 'high',
      },
      {
        name: 'Stakeholder register & communication plan',
        description: 'Identify stakeholders, roles, and how/when they are engaged.',
        estimatedHours: 6,
        phaseOrder: 0,
        priority: 'high',
      },
      {
        name: 'Requirements / BRD',
        description: 'Document functional and non-functional requirements; traceability setup.',
        estimatedHours: 24,
        phaseOrder: 0,
        priority: 'high',
      },
      {
        name: 'Scope baseline sign-off',
        description: 'Formal approval of scope; change control reference point.',
        estimatedHours: 4,
        phaseOrder: 0,
        priority: 'critical',
      },
      // Design
      {
        name: 'Solution architecture',
        description: 'High-level design, interfaces, and constraints agreed with stakeholders.',
        estimatedHours: 16,
        phaseOrder: 1,
        priority: 'high',
      },
      {
        name: 'Detailed design & specifications',
        description: 'Specs, data/contracts, and build-ready documentation.',
        estimatedHours: 24,
        phaseOrder: 1,
        priority: 'high',
      },
      {
        name: 'Schedule & cost baselines',
        description: 'Approved schedule (WBS/CPM) and budget at completion aligned to design.',
        estimatedHours: 16,
        phaseOrder: 1,
        priority: 'high',
      },
      {
        name: 'Risk register (design stage)',
        description: 'Identify risks, owners, and responses; link to plan.',
        estimatedHours: 8,
        phaseOrder: 1,
        priority: 'medium',
      },
      // Build
      {
        name: 'Implementation & feature delivery',
        description: 'Core build work against approved design and scope.',
        estimatedHours: 120,
        phaseOrder: 2,
        priority: 'high',
      },
      {
        name: 'Integration & build stabilization',
        description: 'End-to-end integration, environment readiness, internal smoke results.',
        estimatedHours: 32,
        phaseOrder: 2,
        priority: 'high',
      },
      {
        name: 'Weekly status & variance reporting',
        description: 'Cadence for progress, EV/spend vs plan, and issues.',
        estimatedHours: 6,
        phaseOrder: 2,
        priority: 'medium',
      },
      // Test & UAT
      {
        name: 'Test plan & test cases',
        description: 'Coverage mapped to requirements; entry/exit criteria.',
        estimatedHours: 16,
        phaseOrder: 3,
        priority: 'high',
      },
      {
        name: 'QA execution & defect management',
        description: 'Test cycles, triage, fixes, regression.',
        estimatedHours: 40,
        phaseOrder: 3,
        priority: 'high',
      },
      {
        name: 'UAT with stakeholders',
        description: 'Signed scenarios, feedback, go/no-go inputs for release.',
        estimatedHours: 24,
        phaseOrder: 3,
        priority: 'high',
      },
      {
        name: 'Release readiness checklist',
        description: 'Deploy plan, rollback, comms, and operational readiness.',
        estimatedHours: 8,
        phaseOrder: 3,
        priority: 'critical',
      },
      // Deploy & close
      {
        name: 'Production deployment / go-live',
        description: 'Execute cutover, validation in prod, smoke checks.',
        estimatedHours: 16,
        phaseOrder: 4,
        priority: 'critical',
      },
      {
        name: 'Training & handover',
        description: 'Runbooks, support model, knowledge transfer to operations.',
        estimatedHours: 12,
        phaseOrder: 4,
        priority: 'high',
      },
      {
        name: 'Stabilization / hypercare',
        description: 'Short window for critical fixes post go-live.',
        estimatedHours: 16,
        phaseOrder: 4,
        priority: 'medium',
      },
      {
        name: 'Project closure & lessons learned',
        description: 'Final report, archive, retrospective, and formal closure.',
        estimatedHours: 8,
        phaseOrder: 4,
        priority: 'medium',
      },
      {
        name: 'Formal acceptance sign-off',
        description: 'Contractual or portfolio acceptance recorded.',
        estimatedHours: 4,
        phaseOrder: 4,
        priority: 'critical',
      },
    ],
  },
  /* ──────────────────────────────────────────────────────────────────
   * Phase 5B.1 — Waterfall reference template (pm_waterfall_v2)
   *
   * This is the FIRST and (in 5B.1) the only fully-active system template.
   * It uses the locked PMI process-group row groups and a minimal seed
   * task set (one anchor task per group). The 11-column Waterfall table
   * is declared at the template level via `defaultColumns`.
   *
   * v1 (`pm_waterfall_v1`) is intentionally kept untouched and marked
   * coming-soon via ACTIVE_TEMPLATE_CODES below — no silent mutation.
   * ────────────────────────────────────────────────────────────────── */
  {
    name: 'Waterfall Project',
    code: 'pm_waterfall_v2',
    description:
      'PMI-aligned waterfall reference template. Five process-group row groups (Initiation, Planning, Execution, Monitoring and Control, Closure) with a clean row-and-column work surface, milestone signals, dependency state, and optional governance toggles.',
    purpose:
      'PMI process-group structure with a table-first work surface, dependency-aware rows, and optional admin-governed gates.',
    category: 'Project Management',
    methodology: 'waterfall',
    deliveryMethod: 'WATERFALL',
    packCode: 'waterfall_evm',
    workTypeTags: ['waterfall', 'pmi', 'reference', 'governance', 'baseline'],
    statusGroups: [
      { statusKey: 'BACKLOG',     displayName: 'Backlog',     color: '#888780', order: 0, bucket: 'open',      isDefault: false },
      { statusKey: 'TODO',        displayName: 'To Do',       color: '#B0B0B0', order: 1, bucket: 'open',      isDefault: true  },
      { statusKey: 'IN_PROGRESS', displayName: 'In Progress', color: '#185FA5', order: 2, bucket: 'open',      isDefault: false },
      { statusKey: 'BLOCKED',     displayName: 'Blocked',     color: '#E24B4A', order: 3, bucket: 'open',      isDefault: false },
      { statusKey: 'IN_REVIEW',   displayName: 'In Review',   color: '#534AB7', order: 4, bucket: 'open',      isDefault: false },
      { statusKey: 'DONE',        displayName: 'Done',        color: '#3B6D11', order: 5, bucket: 'done',      isDefault: false },
      { statusKey: 'CANCELED',    displayName: 'Cancelled',   color: '#888780', order: 6, bucket: 'cancelled', isDefault: false },
    ],
    defaultTabs: ['overview', 'tasks', 'gantt', 'board', 'documents', 'risks'],
    defaultView: 'tasks', // TC-B5 (T7): Table default + Gantt + Board enabled
    defaultGovernanceFlags: WATERFALL_GOV,
    columnConfig: WATERFALL_COLUMNS,
    bestFor:
      'Plan-driven projects that need clear phase structure, milestone gates, and the option to enforce governance later.',
    /**
     * Phase 1 (2026-04-08) — locked 8 default columns. Replaces the
     * original 11 (which conflated visible defaults with opt-in fields).
     * Five legacy keys (priority, milestone, dependency, approvalStatus,
     * documentRequired) move to `hiddenColumns` below — the data still
     * exists on every task, just not shown by default. Two new keys
     * (`completion`, `duration`) are derived/computed at render time.
     */
    defaultColumns: [
      'title',
      'assignee',
      'status',
      'startDate',
      'dueDate',
      'completion',
      'duration',
      'remarks',
    ],
    hiddenColumns: [
      'priority',
      'milestone',
      'dependency',
      'approvalStatus',
      'documentRequired',
      'description',
      'tags',
      'dateCreated',
      'dateDone',
    ],
    /**
     * Phase 1 — phase color palette keyed by `reportingKey`. Used to draw
     * the phase color dot, tint the phase progress bar, and accent the
     * phase header in the new render.
     */
    phaseColors: {
      INIT: '#8b5cf6', // purple
      PLAN: '#06b6d4', // teal
      EXEC: '#10b981', // green
      MONITOR: '#f59e0b', // amber
      CLOSE: '#ef4444', // red
    },
    /**
     * Phase 1 — explicit bucket assignment for the seven-status set. New
     * Waterfall projects key governance, completion rollups, and view
     * filters off the bucket, NOT the status name. This survives future
     * customer-driven status renames.
     */
    statusBuckets: {
      not_started: ['BACKLOG', 'TODO'],
      active: ['IN_PROGRESS', 'BLOCKED', 'IN_REVIEW'],
      closed: ['DONE', 'CANCELED'],
    },
    requiredArtifacts: [
      'Project charter',
      'Scope baseline',
      'Schedule baseline',
      'Risk register',
      'Closure report',
    ],
    governanceOptions: [
      'Require project manager',
      'Require start and target dates',
      'Require owner on every row',
      'Require document before milestone completion',
      'Require approval before milestone completion',
      'Require dependency closure before completion',
      'Require weekly status update',
      'Lock structure after work starts',
    ],
    includedViews: ['Table'],
    phases: [
      {
        name: 'Initiation',
        description:
          'Authorize the project: charter, sponsor, high-level scope, and stakeholder identification.',
        order: 0,
        estimatedDurationDays: 5,
        reportingKey: 'INIT',
        gateKey: 'platform.gate.init-to-plan', // TC-B4 (T7)
        docKeys: ['project-charter', 'getting-started-guide'], // TC-B6 (T7)
      },
      {
        name: 'Planning',
        description:
          'Define scope, schedule, cost, quality, resource, communication, risk, procurement, and stakeholder plans.',
        order: 1,
        estimatedDurationDays: 14,
        reportingKey: 'PLAN',
        gateKey: 'platform.gate.plan-to-exec', // TC-B4 (T7)
      },
      {
        name: 'Execution',
        description:
          'Direct and manage project work; deliver against the plan.',
        order: 2,
        estimatedDurationDays: 45,
        reportingKey: 'EXEC',
        gateKey: 'platform.gate.exec-to-monitor', // TC-B4 (T7)
        docKeys: ['status-report'], // TC-B6 (T7)
      },
      {
        name: 'Monitoring and Control',
        description:
          'Track progress, manage changes, and keep performance aligned with the baselines.',
        order: 3,
        estimatedDurationDays: 45,
        reportingKey: 'MONITOR',
        gateKey: 'platform.gate.monitor-to-closure', // TC-B4 (T7)
      },
      {
        name: 'Closure',
        description:
          'Formally close the project or phase: acceptance, handover, lessons learned.',
        order: 4,
        estimatedDurationDays: 5,
        reportingKey: 'CLOSE',
        gateKey: 'platform.gate.closure-to-closed', // TC-B4 (T7)
        docKeys: ['closeout-report'], // TC-B6 (T7)
        isMilestone: true,
      },
    ],
    /*
     * Phase 11 (2026-04-08) — pm_waterfall_v2 expanded from 5 anchor
     * tasks to 16 realistic tasks across the 5 PMI process groups.
     * Status hints distribute completion so a freshly instantiated
     * project shows ~43% overall progress, with each phase in a
     * believable mid-project state:
     *
     *   Initiation (4 tasks):  4 DONE        → 100% complete
     *   Planning   (4 tasks):  3 DONE + 1 IP →  75% complete
     *   Execution  (4 tasks):  1 IP + 3 TODO →   0% complete (active)
     *   M & C      (2 tasks):  1 IP + 1 TODO →   0% complete (active)
     *   Closure    (2 tasks):  2 TODO        →   0% complete (not started)
     *                                            ----
     *                                  total →  ~43% project completion
     *
     * The mix exercises every status bucket (closed/active/not_started)
     * so the dashboard "Project Health" / "Tasks In Progress" cards
     * populate with real signal the moment the template is instantiated.
     * No dates are seeded yet (start/due) — that requires a normalizer
     * extension and lands in a future phase. For now the Duration column
     * shows "—" until the user adds dates manually.
     */
    taskTemplates: [
      // ── Initiation (phaseOrder 0) — all done ──────────────────────
      {
        name: 'Develop project charter',
        description: 'Author and obtain sign-off on the project charter.',
        estimatedHours: 8,
        phaseOrder: 0,
        priority: 'high',
        status: 'DONE',
      },
      {
        name: 'Identify key stakeholders',
        description:
          'Map sponsors, decision-makers, and influencers; record interests and expectations.',
        estimatedHours: 4,
        phaseOrder: 0,
        priority: 'high',
        status: 'DONE',
      },
      {
        name: 'Define high-level scope',
        description:
          'Capture the intended outcome, boundaries, and out-of-scope items.',
        estimatedHours: 6,
        phaseOrder: 0,
        priority: 'high',
        status: 'DONE',
      },
      {
        name: 'Conduct kickoff meeting',
        description:
          'Align stakeholders on goals, roles, governance, and the next-phase entry criteria.',
        estimatedHours: 2,
        phaseOrder: 0,
        priority: 'medium',
        status: 'DONE',
      },

      // ── Planning (phaseOrder 1) — mostly done, one in progress ────
      {
        name: 'Develop project management plan',
        description:
          'Integrate scope, schedule, cost, quality, and risk subsidiary plans.',
        estimatedHours: 16,
        phaseOrder: 1,
        priority: 'high',
        status: 'DONE',
      },
      {
        name: 'Build the work breakdown structure',
        description:
          'Decompose deliverables into work packages with clear acceptance criteria.',
        estimatedHours: 10,
        phaseOrder: 1,
        priority: 'high',
        status: 'DONE',
      },
      {
        name: 'Establish schedule baseline',
        description:
          'Sequence activities, estimate durations, and lock the approved baseline.',
        estimatedHours: 12,
        phaseOrder: 1,
        priority: 'high',
        status: 'DONE',
      },
      {
        name: 'Identify risks and mitigations',
        description:
          'Build the initial risk register with response plans and owners.',
        estimatedHours: 8,
        phaseOrder: 1,
        priority: 'medium',
        status: 'IN_PROGRESS',
      },

      // ── Execution (phaseOrder 2) — active, mostly to-do ───────────
      {
        name: 'Direct and manage project work',
        description:
          'Coordinate execution of the planned work and deliverables.',
        estimatedHours: 24,
        phaseOrder: 2,
        priority: 'high',
        status: 'IN_PROGRESS',
      },
      {
        name: 'Acquire and develop the team',
        description:
          'Onboard contributors, clarify responsibilities, and remove blockers.',
        estimatedHours: 8,
        phaseOrder: 2,
        priority: 'high',
        status: 'TODO',
      },
      {
        name: 'Implement quality assurance reviews',
        description:
          'Run inspections and audits to verify deliverables meet acceptance criteria.',
        estimatedHours: 12,
        phaseOrder: 2,
        priority: 'medium',
        status: 'TODO',
      },
      {
        name: 'Engage stakeholders and report progress',
        description:
          'Maintain stakeholder communication cadence and publish status updates.',
        estimatedHours: 6,
        phaseOrder: 2,
        priority: 'medium',
        status: 'TODO',
      },

      // ── Monitoring and Control (phaseOrder 3) — early ─────────────
      {
        name: 'Monitor and control project work',
        description:
          'Track, review, and report progress against the plan; manage change requests.',
        estimatedHours: 16,
        phaseOrder: 3,
        priority: 'high',
        status: 'IN_PROGRESS',
      },
      {
        name: 'Control schedule, cost, and scope',
        description:
          'Apply variance analysis to schedule, cost, and scope baselines.',
        estimatedHours: 10,
        phaseOrder: 3,
        priority: 'high',
        status: 'TODO',
      },

      // ── Closure (phaseOrder 4) — not started ──────────────────────
      {
        name: 'Close project or phase',
        description:
          'Finalize all activities, obtain formal acceptance, and archive lessons learned.',
        estimatedHours: 8,
        phaseOrder: 4,
        priority: 'critical',
        status: 'TODO',
      },
      {
        name: 'Archive lessons learned',
        description:
          'Capture what worked and what to change for future projects in the org repository.',
        estimatedHours: 4,
        phaseOrder: 4,
        priority: 'medium',
        status: 'TODO',
      },
    ],
  },
  {
    name: 'Agile Project',
    code: 'pm_agile_v1',
    description:
      'Iterative project with backlog, sprint planning, execution, review, and retrospective. One coherent agile project with internal sprint structure.',
    purpose: 'Iterative delivery with sprints, reviews, and retrospectives.',
    category: 'Project Management',
    methodology: 'scrum',
    deliveryMethod: 'SCRUM',
    packCode: 'scrum_core',
    workTypeTags: ['agile', 'sprint', 'iterative', 'backlog'],
    statusGroups: [
      { statusKey: 'BACKLOG',     displayName: 'Backlog',     color: '#888780', order: 0, bucket: 'open',      isDefault: false },
      { statusKey: 'TODO',        displayName: 'To Do',       color: '#B0B0B0', order: 1, bucket: 'open',      isDefault: true  },
      { statusKey: 'IN_PROGRESS', displayName: 'In Progress', color: '#185FA5', order: 2, bucket: 'open',      isDefault: false },
      { statusKey: 'IN_REVIEW',   displayName: 'In Review',   color: '#534AB7', order: 3, bucket: 'open',      isDefault: false },
      { statusKey: 'DONE',        displayName: 'Done',        color: '#3B6D11', order: 4, bucket: 'done',      isDefault: false },
      { statusKey: 'CANCELED',    displayName: 'Cancelled',   color: '#888780', order: 5, bucket: 'cancelled', isDefault: false },
    ],
    defaultTabs: ['overview', 'tasks', 'board', 'documents'],
    defaultGovernanceFlags: SCRUM_GOV,
    columnConfig: AGILE_COLUMNS,
    phases: [
      { name: 'Backlog & Sprint Planning', description: 'Refinement, estimation, sprint goal', order: 0, estimatedDurationDays: 1 },
      { name: 'Sprint Execution', description: 'Build, daily standups, board flow', order: 1, estimatedDurationDays: 12 },
      { name: 'Sprint Review & Retro', description: 'Demo, review, retrospective', order: 2, estimatedDurationDays: 1 },
    ],
    taskTemplates: [
      { name: 'Refine backlog', description: 'Groom and estimate backlog items', estimatedHours: 4, phaseOrder: 0, priority: 'high' },
      { name: 'Sprint goal', description: 'Define and agree on sprint goal', estimatedHours: 1, phaseOrder: 0, priority: 'high' },
      { name: 'Daily standup cadence', description: 'Establish standup time and norms', estimatedHours: 1, phaseOrder: 1, priority: 'medium' },
      { name: 'Development work', description: 'Implement sprint items', estimatedHours: 40, phaseOrder: 1, priority: 'high' },
      { name: 'Sprint demo', description: 'Demonstrate completed work', estimatedHours: 2, phaseOrder: 2, priority: 'medium' },
      { name: 'Retrospective', description: 'Inspect-and-adapt session', estimatedHours: 1, phaseOrder: 2, priority: 'medium' },
    ],
  },
  {
    name: 'Hybrid Project',
    code: 'pm_hybrid_v1',
    description:
      'Phase-based discovery and stabilization with iterative execution in the middle. Combines plan-driven gates with agile delivery.',
    purpose: 'Phase gates outside, iterative delivery inside.',
    category: 'Project Management',
    methodology: 'hybrid',
    deliveryMethod: 'HYBRID',
    packCode: 'hybrid_core',
    workTypeTags: ['hybrid', 'transformation', 'mixed'],
    defaultTabs: ['overview', 'plan', 'tasks', 'board', 'budget', 'change-requests', 'kpis', 'risks'],
    defaultGovernanceFlags: HYBRID_GOV,
    columnConfig: HYBRID_COLUMNS,
    phases: [
      { name: 'Discovery', description: 'Requirements and architecture spikes', order: 0, estimatedDurationDays: 5 },
      { name: 'Iterative Delivery', description: 'Sprint-based execution with governance gates', order: 1, estimatedDurationDays: 30 },
      { name: 'Stabilization', description: 'Integration testing and release readiness', order: 2, estimatedDurationDays: 5 },
      { name: 'Transition', description: 'Deployment, training, and handover', order: 3, estimatedDurationDays: 5 },
    ],
    taskTemplates: [
      { name: 'Architecture spike', description: 'Validate technical approach', estimatedHours: 16, phaseOrder: 0, priority: 'high' },
      { name: 'Governance gate review', description: 'Stage-gate approval checkpoint', estimatedHours: 2, phaseOrder: 1, priority: 'high' },
      { name: 'Iteration planning', description: 'Plan iteration scope and capacity', estimatedHours: 4, phaseOrder: 1, priority: 'high' },
      { name: 'Release readiness', description: 'Verify deployment criteria', estimatedHours: 8, phaseOrder: 2, priority: 'high' },
      { name: 'Knowledge transfer', description: 'Document and train operations team', estimatedHours: 8, phaseOrder: 3, priority: 'medium' },
    ],
  },
  {
    name: 'Risk Register Project',
    code: 'pm_risk_register_v1',
    description:
      'Continuous-flow risk register with severity matrix, mitigation log, and audit trail. Best for GRC and risk management teams.',
    purpose: 'Continuous risk identification, mitigation, and tracking.',
    category: 'Project Management',
    methodology: 'kanban',
    deliveryMethod: 'KANBAN',
    packCode: 'kanban_flow',
    workTypeTags: ['risk', 'compliance', 'register', 'grc'],
    defaultTabs: ['overview', 'board', 'tasks', 'kpis', 'risks', 'documents'],
    defaultGovernanceFlags: KANBAN_GOV,
    columnConfig: KANBAN_COLUMNS,
    phases: [
      { name: 'Continuous Tracking', description: 'Ongoing risk and mitigation management', order: 0, estimatedDurationDays: 90 },
    ],
    taskTemplates: [
      { name: 'Initialize risk register', description: 'Set categories, severity matrix, and ownership', estimatedHours: 4, phaseOrder: 0, priority: 'high' },
      { name: 'Define mitigation playbooks', description: 'Document standard mitigation actions per category', estimatedHours: 4, phaseOrder: 0, priority: 'medium' },
      { name: 'Weekly risk review', description: 'Recurring review of open risks and burn-down', estimatedHours: 1, phaseOrder: 0, priority: 'medium' },
    ],
    riskPresets: [
      { id: 'r1', title: 'Regulatory non-compliance', description: 'Failure to meet regulatory requirements', category: 'compliance', severity: 'critical' },
      { id: 'r2', title: 'Data breach exposure', description: 'Sensitive data exposed due to control gap', category: 'security', severity: 'critical' },
      { id: 'r3', title: 'Audit finding escalation', description: 'Open finding not resolved within SLA', category: 'compliance', severity: 'high' },
    ],
  },

  /* ═══ PRODUCT MANAGEMENT (3) ═════════════════════════════════════════ */

  {
    name: 'Product Discovery Project',
    code: 'product_discovery_v1',
    description:
      'Research-driven discovery with problem framing, user interviews, and decision artifacts. Ends in a go / pivot / kill recommendation.',
    purpose: 'Validate a problem before building anything.',
    category: 'Product Management',
    methodology: 'scrum',
    deliveryMethod: 'SCRUM',
    packCode: 'scrum_core',
    workTypeTags: ['product', 'discovery', 'research', 'validation'],
    defaultTabs: ['overview', 'tasks', 'board', 'documents', 'kpis'],
    defaultGovernanceFlags: SCRUM_GOV,
    columnConfig: AGILE_COLUMNS,
    phases: [
      { name: 'Frame the Problem', description: 'Define problem statement and target users', order: 0, estimatedDurationDays: 3 },
      { name: 'Research & Interviews', description: 'User research, interviews, and synthesis', order: 1, estimatedDurationDays: 10 },
      { name: 'Decide', description: 'Go / pivot / kill recommendation with evidence', order: 2, estimatedDurationDays: 2 },
    ],
    taskTemplates: [
      { name: 'Problem statement', description: 'Author the discovery brief', estimatedHours: 4, phaseOrder: 0, priority: 'high' },
      { name: 'User segments', description: 'Define and prioritize target user segments', estimatedHours: 4, phaseOrder: 0, priority: 'high' },
      { name: 'Interview guide', description: 'Author interview script and consent', estimatedHours: 4, phaseOrder: 1, priority: 'high' },
      { name: 'Run interviews', description: 'Conduct 8–12 user interviews', estimatedHours: 24, phaseOrder: 1, priority: 'high' },
      { name: 'Synthesis & insights', description: 'Cluster findings and write insights doc', estimatedHours: 8, phaseOrder: 1, priority: 'high' },
      { name: 'Recommendation memo', description: 'Go / pivot / kill recommendation', estimatedHours: 4, phaseOrder: 2, priority: 'critical' },
    ],
  },
  {
    name: 'Product Launch Project',
    code: 'product_launch_v1',
    description:
      'Sprint-based product launch execution. Cross-functional coordination across product, marketing, and customer success.',
    purpose: 'Coordinate a market launch across functions.',
    category: 'Product Management',
    methodology: 'scrum',
    deliveryMethod: 'SCRUM',
    packCode: 'scrum_core',
    workTypeTags: ['product', 'launch', 'go-to-market'],
    defaultTabs: ['overview', 'tasks', 'board', 'kpis', 'risks', 'documents'],
    defaultGovernanceFlags: SCRUM_GOV,
    columnConfig: AGILE_COLUMNS,
    phases: [
      { name: 'Launch Planning', description: 'Scope, channels, milestones, success metrics', order: 0, estimatedDurationDays: 5 },
      { name: 'Sprint 1 — Build', description: 'Landing pages, messaging, collateral, FAQs', order: 1, estimatedDurationDays: 14 },
      { name: 'Sprint 2 — Polish', description: 'QA, final reviews, stakeholder sign-off', order: 2, estimatedDurationDays: 14 },
      { name: 'Launch Execution', description: 'Go-live, monitor, and iterate', order: 3, estimatedDurationDays: 3 },
    ],
    taskTemplates: [
      { name: 'Define launch goals', description: 'Align on success metrics and target audience', estimatedHours: 4, phaseOrder: 0, priority: 'high' },
      { name: 'Channel strategy', description: 'Plan distribution channels and timing', estimatedHours: 4, phaseOrder: 0, priority: 'high' },
      { name: 'Build core assets', description: 'Create landing pages, emails, and collateral', estimatedHours: 32, phaseOrder: 1, priority: 'high' },
      { name: 'Stakeholder review', description: 'Review and approve launch materials', estimatedHours: 4, phaseOrder: 2, priority: 'medium' },
      { name: 'Go-live checklist', description: 'Execute launch day activities', estimatedHours: 4, phaseOrder: 3, priority: 'critical' },
      { name: 'Day-2 monitoring', description: 'Track post-launch signals and iterate', estimatedHours: 4, phaseOrder: 3, priority: 'high' },
    ],
  },
  {
    name: 'Roadmap Execution Project',
    code: 'roadmap_execution_v1',
    description:
      'Quarter-cycle roadmap execution with planning, build sprints, mid-quarter check-in, and quarterly review.',
    purpose: 'Execute a quarterly product roadmap.',
    category: 'Product Management',
    methodology: 'hybrid',
    deliveryMethod: 'HYBRID',
    packCode: 'hybrid_core',
    workTypeTags: ['product', 'roadmap', 'quarterly', 'okr'],
    defaultTabs: ['overview', 'plan', 'tasks', 'board', 'kpis', 'risks'],
    defaultGovernanceFlags: HYBRID_GOV,
    columnConfig: HYBRID_COLUMNS,
    phases: [
      { name: 'Quarter Planning', description: 'OKRs, themes, and sprint slate', order: 0, estimatedDurationDays: 5 },
      { name: 'Build Sprints', description: 'Iterative delivery against quarterly themes', order: 1, estimatedDurationDays: 60 },
      { name: 'Mid-Quarter Check-In', description: 'Re-prioritize and adjust', order: 2, estimatedDurationDays: 1 },
      { name: 'Quarterly Review', description: 'OKR scoring and retrospective', order: 3, estimatedDurationDays: 2 },
    ],
    taskTemplates: [
      { name: 'Define quarterly OKRs', description: 'Author 3–5 measurable objectives', estimatedHours: 4, phaseOrder: 0, priority: 'high' },
      { name: 'Theme breakdown', description: 'Break themes into sprint-sized work', estimatedHours: 8, phaseOrder: 0, priority: 'high' },
      { name: 'Sprint cadence', description: 'Establish sprint length and ceremonies', estimatedHours: 2, phaseOrder: 1, priority: 'medium' },
      { name: 'Mid-quarter check-in', description: 'Reprioritize remaining sprints', estimatedHours: 2, phaseOrder: 2, priority: 'high' },
      { name: 'OKR scoring', description: 'Score OKRs against actual outcomes', estimatedHours: 4, phaseOrder: 3, priority: 'high' },
    ],
  },

  /* ═══ SOFTWARE DEVELOPMENT (3) ════════════════════════════════════════ */

  {
    name: 'Scrum Delivery Project',
    code: 'sw_scrum_delivery_v1',
    description:
      'Sprint-based software delivery with backlog refinement, velocity tracking, and per-sprint demo and retro.',
    purpose: 'Build software in 1–4 week sprints.',
    category: 'Software Development',
    methodology: 'scrum',
    deliveryMethod: 'SCRUM',
    packCode: 'scrum_core',
    workTypeTags: ['software', 'sprint', 'velocity', 'engineering'],
    statusGroups: [
      { statusKey: 'BACKLOG',     displayName: 'Backlog',     color: '#888780', order: 0, bucket: 'open',      isDefault: false },
      { statusKey: 'TODO',        displayName: 'To Do',       color: '#B0B0B0', order: 1, bucket: 'open',      isDefault: true  },
      { statusKey: 'IN_PROGRESS', displayName: 'In Progress', color: '#185FA5', order: 2, bucket: 'open',      isDefault: false },
      { statusKey: 'IN_REVIEW',   displayName: 'In Review',   color: '#534AB7', order: 3, bucket: 'open',      isDefault: false },
      { statusKey: 'DONE',        displayName: 'Done',        color: '#3B6D11', order: 4, bucket: 'done',      isDefault: false },
      { statusKey: 'CANCELED',    displayName: 'Cancelled',   color: '#888780', order: 5, bucket: 'cancelled', isDefault: false },
    ],
    defaultTabs: ['overview', 'tasks', 'board', 'documents'],
    defaultGovernanceFlags: SCRUM_GOV,
    columnConfig: AGILE_COLUMNS,
    phases: [
      { name: 'Sprint Planning', description: 'Backlog refinement and sprint goal', order: 0, estimatedDurationDays: 1 },
      { name: 'Sprint Execution', description: 'Development, daily standups, code review', order: 1, estimatedDurationDays: 12 },
      { name: 'Sprint Review & Retro', description: 'Demo, review, and retrospective', order: 2, estimatedDurationDays: 1 },
    ],
    taskTemplates: [
      { name: 'Refine backlog', description: 'Groom and estimate backlog items', estimatedHours: 4, phaseOrder: 0, priority: 'high' },
      { name: 'Sprint goal', description: 'Define sprint goal and definition of done', estimatedHours: 1, phaseOrder: 0, priority: 'high' },
      { name: 'Development work', description: 'Implement sprint items', estimatedHours: 40, phaseOrder: 1, priority: 'high' },
      { name: 'Code review cadence', description: 'Establish PR review SLAs', estimatedHours: 1, phaseOrder: 1, priority: 'medium' },
      { name: 'Sprint demo', description: 'Demonstrate completed work', estimatedHours: 2, phaseOrder: 2, priority: 'medium' },
      { name: 'Retrospective', description: 'Inspect-and-adapt session', estimatedHours: 1, phaseOrder: 2, priority: 'medium' },
    ],
  },
  {
    name: 'Kanban Delivery Project',
    code: 'sw_kanban_delivery_v1',
    description:
      'Continuous-flow software delivery with WIP limits, pull policies, and weekly flow review. No fixed sprints.',
    purpose: 'Continuous delivery with WIP limits and flow metrics.',
    category: 'Software Development',
    methodology: 'kanban',
    deliveryMethod: 'KANBAN',
    packCode: 'kanban_flow',
    workTypeTags: ['software', 'kanban', 'flow', 'continuous'],
    defaultTabs: ['overview', 'board', 'tasks', 'documents'],
    defaultView: 'board', // TC-B5: Board default + List enabled
    defaultGovernanceFlags: KANBAN_GOV,
    columnConfig: KANBAN_COLUMNS,
    phases: [
      { name: 'Continuous Flow', description: 'Ongoing pull-based execution', order: 0, estimatedDurationDays: 90 },
    ],
    taskTemplates: [
      { name: 'Set WIP limits', description: 'Define work-in-progress limits per column', estimatedHours: 1, phaseOrder: 0, priority: 'high' },
      { name: 'Define pull policies', description: 'Document pull and done criteria', estimatedHours: 2, phaseOrder: 0, priority: 'medium' },
      { name: 'Weekly flow review', description: 'Review cycle time, throughput, and bottlenecks', estimatedHours: 1, phaseOrder: 0, priority: 'medium' },
    ],
  },
  {
    name: 'Release Planning Project',
    code: 'sw_release_planning_v1',
    description:
      'Release planning with cut, test, deploy, and hypercare phases. Best for coordinated software releases with formal cuts.',
    purpose: 'Plan, cut, test, deploy, and hypercare a release.',
    category: 'Software Development',
    methodology: 'waterfall',
    deliveryMethod: 'WATERFALL',
    packCode: 'waterfall_evm',
    workTypeTags: ['release', 'deployment', 'cut', 'hypercare'],
    defaultTabs: ['overview', 'plan', 'gantt', 'tasks', 'change-requests', 'documents', 'kpis', 'risks'],
    defaultGovernanceFlags: WATERFALL_GOV,
    columnConfig: WATERFALL_COLUMNS,
    phases: [
      { name: 'Release Plan', description: 'Scope freeze, release notes, dependencies', order: 0, estimatedDurationDays: 5 },
      { name: 'Cut & Stabilize', description: 'Branch cut and stabilization fixes', order: 1, estimatedDurationDays: 5 },
      { name: 'Test', description: 'QA pass, regression, performance', order: 2, estimatedDurationDays: 7 },
      { name: 'Deploy', description: 'Staged rollout and monitoring', order: 3, estimatedDurationDays: 2 },
      { name: 'Hypercare', description: 'Post-release support and stabilization', order: 4, estimatedDurationDays: 7 },
    ],
    taskTemplates: [
      { name: 'Scope freeze', description: 'Lock release scope and document deferrals', estimatedHours: 4, phaseOrder: 0, priority: 'high' },
      { name: 'Release notes draft', description: 'Author customer-facing release notes', estimatedHours: 4, phaseOrder: 0, priority: 'high' },
      { name: 'Branch cut', description: 'Create release branch and tag', estimatedHours: 2, phaseOrder: 1, priority: 'critical' },
      { name: 'QA pass', description: 'Execute regression and smoke suites', estimatedHours: 16, phaseOrder: 2, priority: 'high' },
      { name: 'Staged rollout plan', description: 'Define rollout waves and rollback triggers', estimatedHours: 4, phaseOrder: 3, priority: 'critical' },
      { name: 'Hypercare rota', description: 'Assign on-call coverage post-release', estimatedHours: 2, phaseOrder: 4, priority: 'high' },
    ],
  },

  /* ═══ OPERATIONS (2) ════════════════════════════════════════════════ */

  {
    name: 'Service Improvement Project',
    code: 'ops_service_improvement_v1',
    description:
      'Sprint-based service improvement: assess current state, run improvement sprints, measure outcomes, and standardize.',
    purpose: 'Improve an operational service in measurable steps.',
    category: 'Operations',
    methodology: 'scrum',
    deliveryMethod: 'SCRUM',
    packCode: 'scrum_core',
    workTypeTags: ['operations', 'improvement', 'kaizen', 'service'],
    defaultTabs: ['overview', 'tasks', 'board', 'kpis', 'risks'],
    defaultGovernanceFlags: SCRUM_GOV,
    columnConfig: AGILE_COLUMNS,
    phases: [
      { name: 'Assess Current State', description: 'Map process, baseline metrics, identify bottlenecks', order: 0, estimatedDurationDays: 5 },
      { name: 'Improvement Sprint 1', description: 'Highest-impact improvements', order: 1, estimatedDurationDays: 14 },
      { name: 'Improvement Sprint 2', description: 'Refine and extend improvements', order: 2, estimatedDurationDays: 14 },
      { name: 'Sustain & Measure', description: 'Validate improvements and standardize', order: 3, estimatedDurationDays: 5 },
    ],
    taskTemplates: [
      { name: 'Process mapping', description: 'Document current-state process flows', estimatedHours: 8, phaseOrder: 0, priority: 'high' },
      { name: 'Root cause analysis', description: 'Identify root causes of inefficiencies', estimatedHours: 4, phaseOrder: 0, priority: 'high' },
      { name: 'Implement quick wins', description: 'Execute highest-impact low-effort changes', estimatedHours: 16, phaseOrder: 1, priority: 'high' },
      { name: 'Measure impact', description: 'Compare to baseline metrics', estimatedHours: 4, phaseOrder: 2, priority: 'high' },
      { name: 'Standard work documentation', description: 'Document new standardized processes', estimatedHours: 8, phaseOrder: 3, priority: 'medium' },
    ],
  },
  {
    name: 'Operational Readiness Project',
    code: 'ops_readiness_v1',
    description:
      'Plan-driven operational readiness for a new service or system. Assessment through cutover with hypercare and handover.',
    purpose: 'Prepare operations to take over a new system.',
    category: 'Operations',
    methodology: 'waterfall',
    deliveryMethod: 'WATERFALL',
    packCode: 'waterfall_evm',
    workTypeTags: ['operations', 'readiness', 'cutover', 'handover'],
    defaultTabs: ['overview', 'plan', 'gantt', 'tasks', 'budget', 'change-requests', 'documents', 'kpis', 'risks', 'resources'],
    defaultGovernanceFlags: WATERFALL_GOV,
    columnConfig: WATERFALL_COLUMNS,
    phases: [
      { name: 'Assessment', description: 'Inventory, runbook gap analysis, RACI', order: 0, estimatedDurationDays: 10 },
      { name: 'Build', description: 'Author runbooks, monitoring, on-call rota', order: 1, estimatedDurationDays: 15 },
      { name: 'Validate', description: 'Tabletop and game-day exercises', order: 2, estimatedDurationDays: 5 },
      { name: 'Cutover', description: 'Go-live with rollback plan', order: 3, estimatedDurationDays: 2 },
      { name: 'Hypercare', description: 'Post-cutover support and stabilization', order: 4, estimatedDurationDays: 14 },
    ],
    taskTemplates: [
      { name: 'Inventory & RACI', description: 'Document systems, owners, and responsibilities', estimatedHours: 8, phaseOrder: 0, priority: 'high' },
      { name: 'Runbook authoring', description: 'Write incident and operational runbooks', estimatedHours: 24, phaseOrder: 1, priority: 'high' },
      { name: 'Monitoring & alerting', description: 'Configure dashboards and alert thresholds', estimatedHours: 16, phaseOrder: 1, priority: 'high' },
      { name: 'Game-day exercise', description: 'Run a failure-injection rehearsal', estimatedHours: 8, phaseOrder: 2, priority: 'high' },
      { name: 'Cutover plan', description: 'Sequence cutover steps with rollback criteria', estimatedHours: 8, phaseOrder: 3, priority: 'critical' },
      { name: 'Hypercare rota', description: 'Assign on-call coverage post-cutover', estimatedHours: 2, phaseOrder: 4, priority: 'high' },
    ],
  },

  /* ═══ STARTUPS (2) ══════════════════════════════════════════════════ */

  {
    name: 'MVP Build Project',
    code: 'startup_mvp_build_v1',
    description:
      'Lean MVP build: discover, build the smallest valuable slice, test with real users, and iterate.',
    purpose: 'Build the smallest thing that proves the idea.',
    category: 'Startups',
    methodology: 'scrum',
    deliveryMethod: 'SCRUM',
    packCode: 'scrum_core',
    workTypeTags: ['startup', 'mvp', 'lean', 'validation'],
    defaultTabs: ['overview', 'tasks', 'board', 'kpis'],
    defaultGovernanceFlags: SCRUM_GOV,
    columnConfig: AGILE_COLUMNS,
    phases: [
      { name: 'Discover', description: 'Hypotheses, riskiest assumption, success metric', order: 0, estimatedDurationDays: 3 },
      { name: 'Build', description: 'Smallest valuable slice', order: 1, estimatedDurationDays: 14 },
      { name: 'Test & Learn', description: 'Get the slice in front of real users', order: 2, estimatedDurationDays: 7 },
      { name: 'Iterate', description: 'Persevere or pivot based on evidence', order: 3, estimatedDurationDays: 7 },
    ],
    taskTemplates: [
      { name: 'Hypotheses doc', description: 'Author top 3 hypotheses and success metric', estimatedHours: 4, phaseOrder: 0, priority: 'high' },
      { name: 'Riskiest assumption test', description: 'Plan a low-cost validation', estimatedHours: 4, phaseOrder: 0, priority: 'high' },
      { name: 'Build smallest slice', description: 'Implement the minimum demonstrable slice', estimatedHours: 40, phaseOrder: 1, priority: 'high' },
      { name: 'User test sessions', description: 'Run 5–8 hands-on sessions', estimatedHours: 16, phaseOrder: 2, priority: 'high' },
      { name: 'Persevere/pivot decision', description: 'Make a documented call', estimatedHours: 2, phaseOrder: 3, priority: 'critical' },
    ],
  },
  {
    name: 'Go-to-Market Project',
    code: 'startup_gtm_v1',
    description:
      'Lean go-to-market: positioning, channels, launch, and post-launch iteration. Cross-functional with marketing, sales, and product.',
    purpose: 'Take a product to market and iterate fast.',
    category: 'Startups',
    methodology: 'scrum',
    deliveryMethod: 'SCRUM',
    packCode: 'scrum_core',
    workTypeTags: ['startup', 'gtm', 'launch', 'positioning'],
    defaultTabs: ['overview', 'tasks', 'board', 'kpis', 'risks', 'documents'],
    defaultGovernanceFlags: SCRUM_GOV,
    columnConfig: AGILE_COLUMNS,
    phases: [
      { name: 'Positioning', description: 'Audience, message, channels, pricing', order: 0, estimatedDurationDays: 5 },
      { name: 'Build Assets', description: 'Landing, sales collateral, demo, FAQs', order: 1, estimatedDurationDays: 10 },
      { name: 'Launch', description: 'Go-live across selected channels', order: 2, estimatedDurationDays: 3 },
      { name: 'Iterate', description: 'Measure, learn, and adjust GTM', order: 3, estimatedDurationDays: 14 },
    ],
    taskTemplates: [
      { name: 'Positioning statement', description: 'Author the one-liner and audience map', estimatedHours: 4, phaseOrder: 0, priority: 'high' },
      { name: 'Channel plan', description: 'Pick 2–3 channels and define funnel', estimatedHours: 4, phaseOrder: 0, priority: 'high' },
      { name: 'Landing page', description: 'Build and ship the landing page', estimatedHours: 16, phaseOrder: 1, priority: 'high' },
      { name: 'Sales deck', description: 'Author the first pitch deck', estimatedHours: 8, phaseOrder: 1, priority: 'medium' },
      { name: 'Launch day plan', description: 'Sequence launch-day activities', estimatedHours: 4, phaseOrder: 2, priority: 'critical' },
      { name: 'Weekly GTM review', description: 'Track signups, demos, conversion', estimatedHours: 1, phaseOrder: 3, priority: 'high' },
    ],
  },

  /* ═══ TC-C1 STARTER TIER (5) ═════════════════════════════════════════
   * Beginner-friendly shapes, each exercising the payload machinery.
   * Every Starter ships the getting-started-guide document.
   * Fallbacks pending TC-C1b are tagged `TC-C1b:` for a greppable upgrade.
   */

  // ── T1 — Simple Project (List only, Priority, methodology-agnostic) ──
  {
    name: 'Simple Project',
    code: 'starter_simple_project_v1',
    description:
      'Track work with three statuses and a simple task list. Start here.',
    purpose: 'Track tasks from To Do to Done.',
    category: 'Project Management',
    methodology: null, // TC-C1: methodology-agnostic starter
    deliveryMethod: 'NONE',
    setup: 'Simple',
    packCode: 'none',
    workTypeTags: ['simple', 'starter', 'tasks'],
    defaultTabs: ['overview', 'tasks', 'documents'], // List only — no board/gantt
    defaultView: 'tasks',
    defaultGovernanceFlags: STARTER_GOV,
    // Priority is a Tier-1 always-on column — no Tier-2 toggles needed.
    statusGroups: [
      { statusKey: 'TODO', displayName: 'To Do', color: '#B0B0B0', order: 0, bucket: 'open', isDefault: true },
      { statusKey: 'IN_PROGRESS', displayName: 'In Progress', color: '#185FA5', order: 1, bucket: 'open' },
      { statusKey: 'DONE', displayName: 'Done', color: '#3B6D11', order: 2, bucket: 'done' },
    ],
    phases: [
      { name: 'Tasks', description: 'Your project task list', order: 0, estimatedDurationDays: 30, reportingKey: 'TASKS', docKeys: ['getting-started-guide'] },
    ],
    taskTemplates: [
      { name: 'Add your first task', description: 'Create a task and set its priority', estimatedHours: 1, phaseOrder: 0, priority: 'medium' },
      { name: 'Move it to In Progress', description: 'Update status as work starts', estimatedHours: 1, phaseOrder: 0, priority: 'low' },
      { name: 'Invite a teammate', description: 'Add someone to collaborate', estimatedHours: 1, phaseOrder: 0, priority: 'low' },
      { name: 'Mark a task Done', description: 'Complete a task to see progress', estimatedHours: 1, phaseOrder: 0, priority: 'low' },
    ],
  },

  // ── T2 — Board (4 columns, Priority + Tags, Board default) ──────────
  {
    name: 'Board',
    code: 'starter_board_v1',
    description:
      'Visualize work as cards moving across four columns. Great for flow.',
    purpose: 'Move cards across a simple board.',
    category: 'Project Management',
    methodology: 'kanban', // board is kanban's canonical surface
    deliveryMethod: 'KANBAN',
    setup: 'Simple',
    packCode: 'none',
    workTypeTags: ['board', 'kanban', 'starter'],
    defaultTabs: ['overview', 'board', 'tasks', 'documents'],
    defaultView: 'board',
    defaultGovernanceFlags: STARTER_GOV,
    columnConfig: { labels: true }, // show the tags/labels column
    statusGroups: [
      { statusKey: 'TODO', displayName: 'To Do', color: '#B0B0B0', order: 0, bucket: 'open', isDefault: true },
      { statusKey: 'IN_PROGRESS', displayName: 'In Progress', color: '#185FA5', order: 1, bucket: 'open' },
      { statusKey: 'IN_REVIEW', displayName: 'In Review', color: '#534AB7', order: 2, bucket: 'open' },
      { statusKey: 'DONE', displayName: 'Done', color: '#3B6D11', order: 3, bucket: 'done' },
    ],
    phases: [
      { name: 'Board', description: 'Cards flow left to right', order: 0, estimatedDurationDays: 30, reportingKey: 'BOARD', docKeys: ['getting-started-guide'] },
    ],
    taskTemplates: [
      { name: 'Draft the brief', description: 'Write down the goal and scope', estimatedHours: 2, phaseOrder: 0, priority: 'high', status: 'TODO', tags: ['planning'] },
      { name: 'Design the layout', description: 'Sketch the first version', estimatedHours: 4, phaseOrder: 0, priority: 'medium', status: 'IN_PROGRESS', tags: ['design'] },
      { name: 'Build the feature', description: 'Implement the core work', estimatedHours: 8, phaseOrder: 0, priority: 'high', status: 'IN_PROGRESS', tags: ['build'] },
      { name: 'Review the work', description: 'Check quality before release', estimatedHours: 2, phaseOrder: 0, priority: 'medium', status: 'IN_REVIEW', tags: ['review'] },
      { name: 'Fix feedback', description: 'Address review comments', estimatedHours: 2, phaseOrder: 0, priority: 'medium', status: 'TODO', tags: ['build', 'fix'] },
      { name: 'Ship it', description: 'Release and announce', estimatedHours: 1, phaseOrder: 0, priority: 'high', status: 'DONE', tags: ['release'] },
    ],
  },

  // ── T3 — Gantt Timeline (phases, durations, real milestones) ────────
  {
    name: 'Gantt Timeline',
    code: 'starter_gantt_v1',
    description:
      'Plan work on a timeline with phases, durations, and milestones.',
    purpose: 'See work on a timeline with milestones.',
    category: 'Project Management',
    methodology: 'waterfall', // sequential timeline
    deliveryMethod: 'WATERFALL',
    setup: 'Standard',
    packCode: 'none',
    workTypeTags: ['gantt', 'timeline', 'starter'],
    defaultTabs: ['overview', 'gantt', 'tasks', 'documents'],
    defaultView: 'gantt',
    defaultGovernanceFlags: STARTER_GANTT_GOV,
    columnConfig: { duration: true, milestone: true, dependency: true },
    // NOTE: phases carry NO gateKeys — Starter Gantt is timeline-only.
    statusGroups: [
      { statusKey: 'TODO', displayName: 'To Do', color: '#B0B0B0', order: 0, bucket: 'open', isDefault: true },
      { statusKey: 'IN_PROGRESS', displayName: 'In Progress', color: '#185FA5', order: 1, bucket: 'open' },
      { statusKey: 'BLOCKED', displayName: 'Blocked', color: '#E24B4A', order: 2, bucket: 'open' },
      { statusKey: 'IN_REVIEW', displayName: 'In Review', color: '#534AB7', order: 3, bucket: 'open' },
      { statusKey: 'DONE', displayName: 'Done', color: '#3B6D11', order: 4, bucket: 'done' },
    ],
    phases: [
      { name: 'Plan', description: 'Define scope and schedule', order: 0, estimatedDurationDays: 7, reportingKey: 'PLAN', docKeys: ['getting-started-guide'] },
      { name: 'Execute', description: 'Do the planned work', order: 1, estimatedDurationDays: 21, reportingKey: 'EXEC' },
      { name: 'Wrap-up', description: 'Review and hand over', order: 2, estimatedDurationDays: 5, reportingKey: 'WRAP' },
    ],
    taskTemplates: [
      { name: 'Define scope', description: 'Agree on what is in and out', estimatedHours: 4, phaseOrder: 0, priority: 'high' },
      { name: 'Build the schedule', description: 'Lay out phases and dates', estimatedHours: 4, phaseOrder: 0, priority: 'high' },
      // Real milestone via F5/F2 passthrough (isMilestone → work_tasks.is_milestone).
      { name: 'Plan approved', description: 'Sign-off marks the plan complete', estimatedHours: 1, phaseOrder: 0, priority: 'high', isMilestone: true },
      // TC-C1b: dependency ("after Plan approved") encoded in the name until
      // instantiate wires WorkTaskDependency rows (F1).
      { name: 'Start build (after Plan approved)', description: 'Begin execution once the plan is signed off', estimatedHours: 8, phaseOrder: 1, priority: 'high' },
      { name: 'Mid-build review', description: 'Check progress against the plan', estimatedHours: 2, phaseOrder: 1, priority: 'medium' },
      { name: 'Finish build', description: 'Complete the execution work', estimatedHours: 8, phaseOrder: 1, priority: 'high' },
      // TC-C1b: dependency ("after Finish build") encoded in the name (F1).
      { name: 'Handover (after Finish build)', description: 'Transfer deliverables to owners', estimatedHours: 2, phaseOrder: 2, priority: 'medium' },
      { name: 'Project complete', description: 'Final milestone: work delivered', estimatedHours: 1, phaseOrder: 2, priority: 'high', isMilestone: true },
    ],
  },

  // ── T4 — Product Backlog (funnel statuses, iterations, story points) ─
  {
    name: 'Product Backlog',
    code: 'starter_backlog_v1',
    description:
      'Groom a backlog and pull items into sprints. Sized with points.',
    purpose: 'Prioritize a backlog and size with points.',
    category: 'Product Management',
    methodology: 'scrum',
    deliveryMethod: 'SCRUM',
    setup: 'Standard',
    packCode: 'none',
    workTypeTags: ['backlog', 'scrum', 'starter'],
    defaultTabs: ['overview', 'tasks', 'board', 'documents'],
    defaultView: 'tasks', // List default per blueprint
    defaultGovernanceFlags: STARTER_BACKLOG_GOV, // iterations ON
    columnConfig: { storyPoints: true, sprint: true, labels: true },
    // Funnel: Backlog + Ready + In Progress = open bucket; Done = done.
    statusGroups: [
      { statusKey: 'BACKLOG', displayName: 'Backlog', color: '#888780', order: 0, bucket: 'open', isDefault: true },
      { statusKey: 'READY', displayName: 'Ready', color: '#B0B0B0', order: 1, bucket: 'open' },
      { statusKey: 'IN_PROGRESS', displayName: 'In Progress', color: '#185FA5', order: 2, bucket: 'open' },
      { statusKey: 'DONE', displayName: 'Done', color: '#3B6D11', order: 3, bucket: 'done' },
    ],
    phases: [
      { name: 'Backlog', description: 'Groomed, prioritized items', order: 0, estimatedDurationDays: 30, reportingKey: 'BACKLOG', docKeys: ['getting-started-guide'] },
    ],
    // Story points are real via F5. TC-C1b: "Sprint-ready?" (checkbox) and
    // "Type" (dropdown) are custom fields — deferred to attribute seeding.
    taskTemplates: [
      { name: 'User can sign up', description: 'Create an account with email', estimatedHours: 8, phaseOrder: 0, priority: 'high', status: 'BACKLOG', storyPoints: 5 },
      { name: 'User can log in', description: 'Authenticate and start a session', estimatedHours: 5, phaseOrder: 0, priority: 'high', status: 'BACKLOG', storyPoints: 3 },
      { name: 'Reset a password', description: 'Recover access via email link', estimatedHours: 5, phaseOrder: 0, priority: 'medium', status: 'BACKLOG', storyPoints: 3 },
      { name: 'Edit a profile', description: 'Update name and avatar', estimatedHours: 5, phaseOrder: 0, priority: 'medium', status: 'BACKLOG', storyPoints: 3 },
      { name: 'Search the catalog', description: 'Find items by keyword', estimatedHours: 8, phaseOrder: 0, priority: 'medium', status: 'BACKLOG', storyPoints: 8 },
      { name: 'Add to favorites', description: 'Save items for later', estimatedHours: 3, phaseOrder: 0, priority: 'low', status: 'BACKLOG', storyPoints: 2 },
      { name: 'Export a report', description: 'Download results as a file', estimatedHours: 8, phaseOrder: 0, priority: 'low', status: 'BACKLOG', storyPoints: 5 },
      { name: 'Notify on updates', description: 'Send an alert when data changes', estimatedHours: 13, phaseOrder: 0, priority: 'medium', status: 'BACKLOG', storyPoints: 8 },
    ],
  },

  // ── T5 — WBS (parent/child skeleton via grouped naming fallback) ────
  {
    name: 'Work Breakdown',
    code: 'starter_wbs_v1',
    description:
      'Break work into a tree of parents and children. Classic breakdown.',
    purpose: 'Break scope into a work breakdown.',
    category: 'Project Management',
    methodology: null, // WBS is a structuring technique, not a methodology
    deliveryMethod: 'NONE',
    setup: 'Standard',
    packCode: 'none',
    workTypeTags: ['wbs', 'breakdown', 'starter'],
    defaultTabs: ['overview', 'tasks', 'documents'],
    defaultView: 'tasks',
    defaultGovernanceFlags: STARTER_GOV,
    statusGroups: [
      { statusKey: 'TODO', displayName: 'To Do', color: '#B0B0B0', order: 0, bucket: 'open', isDefault: true },
      { statusKey: 'IN_PROGRESS', displayName: 'In Progress', color: '#185FA5', order: 1, bucket: 'open' },
      { statusKey: 'DONE', displayName: 'Done', color: '#3B6D11', order: 2, bucket: 'done' },
    ],
    phases: [
      { name: 'Section 1', description: 'First work section', order: 0, estimatedDurationDays: 15, reportingKey: 'S1', docKeys: ['getting-started-guide'] },
      { name: 'Section 2', description: 'Second work section', order: 1, estimatedDurationDays: 15, reportingKey: 'S2' },
      { name: 'Section 3', description: 'Third work section', order: 2, estimatedDurationDays: 15, reportingKey: 'S3' },
    ],
    // TC-C1b: parent/child hierarchy (parent_task_id, F3) is NOT wired at
    // instantiate. Fallback = flat tasks with grouped "N." / "N.M" naming so
    // the breakdown reads as a tree. C1b replaces this with real parentage.
    taskTemplates: [
      { name: '1. Plan', description: 'Parent: planning workstream', estimatedHours: 1, phaseOrder: 0, priority: 'high' },
      { name: '1.1 Define goals', description: 'Set the objectives', estimatedHours: 4, phaseOrder: 0, priority: 'medium' },
      { name: '1.2 Identify risks', description: 'List what could go wrong', estimatedHours: 4, phaseOrder: 0, priority: 'medium' },
      { name: '1.3 Set the schedule', description: 'Lay out the timeline', estimatedHours: 4, phaseOrder: 0, priority: 'medium' },
      { name: '2. Build', description: 'Parent: build workstream', estimatedHours: 1, phaseOrder: 1, priority: 'high' },
      { name: '2.1 Design', description: 'Design the solution', estimatedHours: 8, phaseOrder: 1, priority: 'medium' },
      { name: '2.2 Develop', description: 'Build the solution', estimatedHours: 16, phaseOrder: 1, priority: 'high' },
      { name: '2.3 Test', description: 'Verify it works', estimatedHours: 8, phaseOrder: 1, priority: 'medium' },
      { name: '3. Close', description: 'Parent: closeout workstream', estimatedHours: 1, phaseOrder: 2, priority: 'high' },
      { name: '3.1 Review', description: 'Review the outcome', estimatedHours: 4, phaseOrder: 2, priority: 'medium' },
      { name: '3.2 Document', description: 'Write up the results', estimatedHours: 4, phaseOrder: 2, priority: 'low' },
      { name: '3.3 Handover', description: 'Transfer to owners', estimatedHours: 4, phaseOrder: 2, priority: 'medium' },
    ],
  },

  /* ═══ TC-C1b MECHANICS FIXTURE (hidden — NOT in ACTIVE_TEMPLATE_CODES) ═══
   * Exercises all three TC-C1b mechanics end-to-end for regression + Stage-2
   * live proof: task dependencies (dependsOn), parentage (parentKey), and
   * template-defined custom attributes. Intentionally coming-soon (hidden from
   * the product catalog). Referenced tasks carry stable `key`s.
   */
  {
    name: 'Mechanics Fixture',
    code: 'mechanics_fixture_v1',
    description:
      'Internal fixture exercising dependencies, parentage, and custom fields.',
    purpose: 'Internal mechanics regression fixture.',
    category: 'Project Management',
    methodology: null,
    deliveryMethod: 'NONE',
    setup: 'Advanced',
    packCode: 'none',
    workTypeTags: ['fixture', 'internal'],
    defaultTabs: ['overview', 'tasks', 'documents'],
    defaultView: 'tasks',
    defaultGovernanceFlags: STARTER_GOV,
    statusGroups: [
      { statusKey: 'TODO', displayName: 'To Do', color: '#B0B0B0', order: 0, bucket: 'open', isDefault: true },
      { statusKey: 'IN_PROGRESS', displayName: 'In Progress', color: '#185FA5', order: 1, bucket: 'open' },
      { statusKey: 'DONE', displayName: 'Done', color: '#3B6D11', order: 2, bucket: 'done' },
    ],
    customAttributes: [
      { key: 'fixture_sprint_ready', label: 'Sprint-ready?', dataType: 'boolean' },
      { key: 'fixture_type', label: 'Type', dataType: 'single_select', options: { values: ['Feature', 'Bug', 'Chore'] } },
    ],
    phases: [
      { name: 'Fixture', description: 'Mechanics fixture phase', order: 0, estimatedDurationDays: 10, reportingKey: 'FIX' },
    ],
    // Parent A has two children; child-a2 depends on child-a1; task-b depends
    // on parent-a. Acyclic — instantiation must succeed and materialize the
    // parent tree + FS dependency rows.
    taskTemplates: [
      { name: 'Parent A', description: 'Parent task', estimatedHours: 1, phaseOrder: 0, priority: 'high', key: 'parent-a' },
      { name: 'Child A1', description: 'First child', estimatedHours: 2, phaseOrder: 0, priority: 'medium', key: 'child-a1', parentKey: 'parent-a' },
      { name: 'Child A2', description: 'Second child, after A1', estimatedHours: 2, phaseOrder: 0, priority: 'medium', key: 'child-a2', parentKey: 'parent-a', dependsOn: ['child-a1'] },
      { name: 'Task B', description: 'Depends on Parent A', estimatedHours: 2, phaseOrder: 0, priority: 'medium', key: 'task-b', dependsOn: ['parent-a'] },
    ],
  },
];

/**
 * Phase 5B.1 — Active templates registry.
 *
 * System templates in this set are seeded with `is_active = true`, are shown
 * in Template Center (with `isActive`), and are not marked "Coming soon" via
 * `isTemplateComingSoon()`. Codes must exist on rows in `SYSTEM_TEMPLATE_DEFS`.
 *
 * Legacy `pm_waterfall_v1` and non-listed definitions (e.g. ops_*) stay
 * coming-soon until explicitly added. Backend instantiation routes are not
 * hard-rejected; the UI is the primary gate.
 */
export const ACTIVE_TEMPLATE_CODES: ReadonlySet<string> = new Set<string>([
  // Project / software delivery
  'pm_waterfall_v2',
  'pm_agile_v1',
  'pm_hybrid_v1',
  'sw_scrum_delivery_v1',
  'sw_kanban_delivery_v1',
  'sw_release_planning_v1',
  'roadmap_execution_v1',
  // Product & startups
  'product_discovery_v1',
  'product_launch_v1',
  'startup_mvp_build_v1',
  'startup_gtm_v1',
  // TC-C1 Starter tier
  'starter_simple_project_v1',
  'starter_board_v1',
  'starter_gantt_v1',
  'starter_backlog_v1',
  'starter_wbs_v1',
]);

export function isTemplateComingSoon(code: string | null | undefined): boolean {
  if (!code) return false;
  return !ACTIVE_TEMPLATE_CODES.has(code);
}