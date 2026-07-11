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
    /** Stable key anchoring dependsOn/parentKey references (TC-C1b mechanic). */
    key?: string;
    /** TC-C1b (F1): keys of predecessor tasks → work_task_dependencies (FS). */
    dependsOn?: string[];
    /** TC-C1b (F3): parent task key → work_tasks.parent_task_id. */
    parentKey?: string;
    /** TC-B7 (D3): Gantt start offset (days) from the project anchor date. */
    startOffsetDays?: number;
    /** TC-B7 (D3): Gantt duration (days); dueDate = startDate + durationDays. */
    durationDays?: number;
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
    /** TC-C2: when true, the field is locked (definition + attachment). */
    locked?: boolean;
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
    setup: 'Advanced', // TC-C2 (T7)
    // TC-C2 (T7): Risk Level ships as a LOCKED custom field. % Complete and
    // Estimate/Actual Hours are native columns (percent_complete, estimate_hours,
    // actual_hours) surfaced via the work surface.
    customAttributes: [
      { key: 'waterfall_risk_level', label: 'Risk Level', dataType: 'single_select', options: { values: ['Low', 'Medium', 'High'] }, locked: true },
    ],
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
        isMilestone: true, // TC-C2 (T7): milestone at the plan→exec gate
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
        isMilestone: true, // TC-C2 (T7): milestone at the monitor→closure gate
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
        startOffsetDays: 0,
        durationDays: 1,
      },
      {
        name: 'Identify key stakeholders',
        description:
          'Map sponsors, decision-makers, and influencers; record interests and expectations.',
        estimatedHours: 4,
        phaseOrder: 0,
        priority: 'high',
        status: 'DONE',
        startOffsetDays: 1,
        durationDays: 2,
      },
      {
        name: 'Define high-level scope',
        description:
          'Capture the intended outcome, boundaries, and out-of-scope items.',
        estimatedHours: 6,
        phaseOrder: 0,
        priority: 'high',
        status: 'DONE',
        startOffsetDays: 3,
        durationDays: 1,
      },
      {
        name: 'Conduct kickoff meeting',
        description:
          'Align stakeholders on goals, roles, governance, and the next-phase entry criteria.',
        estimatedHours: 2,
        phaseOrder: 0,
        priority: 'medium',
        status: 'DONE',
        startOffsetDays: 4,
        durationDays: 1,
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
        startOffsetDays: 5,
        durationDays: 3,
      },
      {
        name: 'Build the work breakdown structure',
        description:
          'Decompose deliverables into work packages with clear acceptance criteria.',
        estimatedHours: 10,
        phaseOrder: 1,
        priority: 'high',
        status: 'DONE',
        startOffsetDays: 8,
        durationDays: 3,
      },
      {
        name: 'Establish schedule baseline',
        description:
          'Sequence activities, estimate durations, and lock the approved baseline.',
        estimatedHours: 12,
        phaseOrder: 1,
        priority: 'high',
        status: 'DONE',
        startOffsetDays: 11,
        durationDays: 2,
      },
      {
        name: 'Identify risks and mitigations',
        description:
          'Build the initial risk register with response plans and owners.',
        estimatedHours: 8,
        phaseOrder: 1,
        priority: 'medium',
        status: 'IN_PROGRESS',
        startOffsetDays: 13,
        durationDays: 2,
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
        startOffsetDays: 19,
        durationDays: 11,
      },
      {
        name: 'Acquire and develop the team',
        description:
          'Onboard contributors, clarify responsibilities, and remove blockers.',
        estimatedHours: 8,
        phaseOrder: 2,
        priority: 'high',
        status: 'TODO',
        startOffsetDays: 30,
        durationDays: 10,
      },
      {
        name: 'Implement quality assurance reviews',
        description:
          'Run inspections and audits to verify deliverables meet acceptance criteria.',
        estimatedHours: 12,
        phaseOrder: 2,
        priority: 'medium',
        status: 'TODO',
        startOffsetDays: 40,
        durationDays: 10,
      },
      {
        name: 'Engage stakeholders and report progress',
        description:
          'Maintain stakeholder communication cadence and publish status updates.',
        estimatedHours: 6,
        phaseOrder: 2,
        priority: 'medium',
        status: 'TODO',
        startOffsetDays: 50,
        durationDays: 14,
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
        startOffsetDays: 64,
        durationDays: 22,
      },
      {
        name: 'Control schedule, cost, and scope',
        description:
          'Apply variance analysis to schedule, cost, and scope baselines.',
        estimatedHours: 10,
        phaseOrder: 3,
        priority: 'high',
        status: 'TODO',
        startOffsetDays: 86,
        durationDays: 23,
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
        startOffsetDays: 109,
        durationDays: 3,
      },
      {
        name: 'Archive lessons learned',
        description:
          'Capture what worked and what to change for future projects in the org repository.',
        estimatedHours: 4,
        phaseOrder: 4,
        priority: 'medium',
        status: 'TODO',
        startOffsetDays: 112,
        durationDays: 2,
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
    // T9 (TC-C2): outer Plan/Deliver/Close gates with iterative delivery inside.
    description:
      'Plan and close with gates; deliver iteratively in between. Best of both.',
    purpose: 'Gates outside, iterative delivery inside.',
    category: 'Project Management',
    methodology: 'hybrid',
    deliveryMethod: 'HYBRID',
    setup: 'Standard',
    packCode: 'hybrid_core',
    workTypeTags: ['hybrid', 'gates', 'iterative'],
    defaultTabs: ['overview', 'gantt', 'board', 'tasks', 'documents'], // Gantt default + Board + Table
    defaultView: 'gantt',
    defaultGovernanceFlags: HYBRID_GOV, // iterations ON
    columnConfig: HYBRID_COLUMNS, // storyPoints + duration + milestone ON; % complete is Tier-1
    // Story Points + % Complete are native columns — no custom fields needed.
    // Outer phase gates map to canonical platform.gate.* keys:
    //   Plan → Deliver = platform.gate.plan-to-deliver
    //   Deliver → Close = platform.gate.deliver-to-close
    phases: [
      { name: 'Plan', description: 'Scope, approach, and approval', order: 0, estimatedDurationDays: 10, reportingKey: 'PLAN', gateKey: 'platform.gate.plan-to-deliver', docKeys: ['getting-started-guide'] },
      { name: 'Deliver', description: 'Iterative build and review', order: 1, estimatedDurationDays: 30, reportingKey: 'DELIVER', gateKey: 'platform.gate.deliver-to-close' },
      { name: 'Close', description: 'Stabilize, hand over, and close', order: 2, estimatedDurationDays: 10, reportingKey: 'CLOSE', isMilestone: true },
    ],
    // 6 tasks; two milestones at the gate boundaries.
    taskTemplates: [
      { name: 'Define scope and approach', description: 'Agree what and how', estimatedHours: 8, phaseOrder: 0, priority: 'high', key: 'plan-scope' },
      { name: 'Plan approved', description: 'Gate: ready to deliver', estimatedHours: 1, phaseOrder: 0, priority: 'high', isMilestone: true, key: 'plan-gate', dependsOn: ['plan-scope'] },
      { name: 'Iteration planning', description: 'Plan the next increment', estimatedHours: 4, phaseOrder: 1, priority: 'high', storyPoints: 3, dependsOn: ['plan-gate'] },
      { name: 'Build increment', description: 'Deliver working software', estimatedHours: 40, phaseOrder: 1, priority: 'high', storyPoints: 8 },
      { name: 'Delivery accepted', description: 'Gate: ready to close', estimatedHours: 1, phaseOrder: 1, priority: 'high', isMilestone: true, key: 'deliver-gate' },
      { name: 'Handover and close', description: 'Transfer and wrap up', estimatedHours: 8, phaseOrder: 2, priority: 'medium', dependsOn: ['deliver-gate'] },
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
    setup: 'Standard', // TC-C3 (T15)
    defaultTabs: ['overview', 'tasks', 'board', 'documents', 'kpis'],
    defaultView: 'tasks',
    defaultGovernanceFlags: SCRUM_GOV,
    columnConfig: AGILE_COLUMNS,
    // Funnel with a Rejected (cancelled) outcome.
    statusGroups: [
      { statusKey: 'TO_EXPLORE', displayName: 'To Explore', color: '#888780', order: 0, bucket: 'open', isDefault: true },
      { statusKey: 'RESEARCHING', displayName: 'Researching', color: '#185FA5', order: 1, bucket: 'open' },
      { statusKey: 'DECIDING', displayName: 'Deciding', color: '#534AB7', order: 2, bucket: 'open' },
      { statusKey: 'VALIDATED', displayName: 'Validated', color: '#3B6D11', order: 3, bucket: 'done' },
      { statusKey: 'REJECTED', displayName: 'Rejected', color: '#888780', order: 4, bucket: 'cancelled' },
    ],
    // Discovery pack (F4): Confidence + Decision.
    customAttributes: [
      { key: 'discovery_confidence', label: 'Confidence', dataType: 'single_select', options: { values: ['Low', 'Medium', 'High'] } },
      { key: 'discovery_decision', label: 'Decision', dataType: 'single_select', options: { values: ['Go', 'Pivot', 'Kill'] } },
    ],
    // TC-FORMS: an interview-intake form is NOTED-GAP — forms mechanics do not
    // exist yet (separate track).
    phases: [
      { name: 'Frame the Problem', description: 'Define problem statement and target users', order: 0, estimatedDurationDays: 3, reportingKey: 'FRAME', docKeys: ['getting-started-guide'] },
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
    setup: 'Standard', // TC-C3 (T13)
    defaultTabs: ['overview', 'tasks', 'board', 'kpis', 'risks', 'documents'],
    defaultGovernanceFlags: SCRUM_GOV,
    columnConfig: AGILE_COLUMNS,
    // Launch pack (F4): Channel + Readiness.
    customAttributes: [
      { key: 'launch_channel', label: 'Channel', dataType: 'single_select', options: { values: ['Email', 'Social', 'Paid', 'PR', 'Partner'] } },
      { key: 'launch_readiness', label: 'Readiness', dataType: 'single_select', options: { values: ['Not Started', 'In Progress', 'Ready'] } },
    ],
    // Phases-as-workstreams — no gates.
    phases: [
      { name: 'Launch Planning', description: 'Scope, channels, milestones, success metrics', order: 0, estimatedDurationDays: 5, reportingKey: 'PLAN', docKeys: ['getting-started-guide'] },
      { name: 'Build', description: 'Landing pages, messaging, collateral, FAQs', order: 1, estimatedDurationDays: 14, reportingKey: 'BUILD' },
      { name: 'Polish', description: 'QA, final reviews, stakeholder sign-off', order: 2, estimatedDurationDays: 14, reportingKey: 'POLISH' },
      { name: 'Launch Execution', description: 'Go-live, monitor, and iterate', order: 3, estimatedDurationDays: 3, reportingKey: 'EXEC' },
    ],
    // Real dependencies + a launch-day milestone.
    taskTemplates: [
      { name: 'Define launch goals', description: 'Align on success metrics and target audience', estimatedHours: 4, phaseOrder: 0, priority: 'high', key: 'goals' },
      { name: 'Channel strategy', description: 'Plan distribution channels and timing', estimatedHours: 4, phaseOrder: 0, priority: 'high', key: 'channels', dependsOn: ['goals'] },
      { name: 'Build core assets', description: 'Create landing pages, emails, and collateral', estimatedHours: 32, phaseOrder: 1, priority: 'high', key: 'assets', dependsOn: ['channels'] },
      { name: 'Stakeholder review', description: 'Review and approve launch materials', estimatedHours: 4, phaseOrder: 2, priority: 'medium', key: 'review', dependsOn: ['assets'] },
      { name: 'Launch day', description: 'Go-live across selected channels', estimatedHours: 4, phaseOrder: 3, priority: 'critical', isMilestone: true, key: 'launch-day', dependsOn: ['review'] },
      { name: 'Day-2 monitoring', description: 'Track post-launch signals and iterate', estimatedHours: 4, phaseOrder: 3, priority: 'high', dependsOn: ['launch-day'] },
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
    setup: 'Standard', // TC-C3 (T11)
    defaultTabs: ['overview', 'tasks', 'gantt', 'board', 'documents'], // List default + Gantt + Board
    defaultView: 'tasks',
    defaultGovernanceFlags: HYBRID_GOV,
    columnConfig: HYBRID_COLUMNS,
    // Funnel: Idea → Under Review → Planned → In Progress → Complete.
    statusGroups: [
      { statusKey: 'IDEA', displayName: 'Idea', color: '#888780', order: 0, bucket: 'open', isDefault: true },
      { statusKey: 'UNDER_REVIEW', displayName: 'Under Review', color: '#B0B0B0', order: 1, bucket: 'open' },
      { statusKey: 'PLANNED', displayName: 'Planned', color: '#534AB7', order: 2, bucket: 'open' },
      { statusKey: 'IN_PROGRESS', displayName: 'In Progress', color: '#185FA5', order: 3, bucket: 'open' },
      { statusKey: 'COMPLETE', displayName: 'Complete', color: '#3B6D11', order: 4, bucket: 'done' },
    ],
    // Roadmap pack (F4): Theme + Effort (t-shirt size).
    customAttributes: [
      { key: 'roadmap_theme', label: 'Theme', dataType: 'text' },
      { key: 'roadmap_effort', label: 'Effort', dataType: 'single_select', options: { values: ['XS', 'S', 'M', 'L', 'XL'] } },
    ],
    phases: [
      { name: 'Quarter Planning', description: 'OKRs, themes, and sprint slate', order: 0, estimatedDurationDays: 5, reportingKey: 'QPLAN', docKeys: ['getting-started-guide'] },
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
    // T6 (TC-C2): canonical Scrum template — absorbs the retired Agile Project.
    description:
      'Deliver in sprints with epics, stories, and points. Board-first flow.',
    purpose: 'Build software in short, repeatable sprints.',
    category: 'Software Development',
    methodology: 'scrum',
    deliveryMethod: 'SCRUM',
    setup: 'Standard',
    packCode: 'scrum_core',
    workTypeTags: ['software', 'sprint', 'scrum', 'agile'],
    // Blueprint T6: To Do / In Progress / In Review / Done.
    statusGroups: [
      { statusKey: 'TODO', displayName: 'To Do', color: '#B0B0B0', order: 0, bucket: 'open', isDefault: true },
      { statusKey: 'IN_PROGRESS', displayName: 'In Progress', color: '#185FA5', order: 1, bucket: 'open' },
      { statusKey: 'IN_REVIEW', displayName: 'In Review', color: '#534AB7', order: 2, bucket: 'open' },
      { statusKey: 'DONE', displayName: 'Done', color: '#3B6D11', order: 3, bucket: 'done' },
    ],
    defaultTabs: ['overview', 'board', 'tasks', 'documents'], // Board default + List(tasks) + Table
    defaultView: 'board',
    defaultGovernanceFlags: SCRUM_GOV, // iterations ON (2-week sprints are project config)
    columnConfig: AGILE_COLUMNS, // storyPoints, sprint, labels ON
    // Story Points / Remaining Hours / Acceptance Criteria are native work_task
    // columns; Type ships as a custom field (F4). Acceptance Criteria is native
    // (acceptance_criteria jsonb) — always present, no template lock needed.
    customAttributes: [
      { key: 'scrum_type', label: 'Type', dataType: 'single_select', options: { values: ['Story', 'Bug', 'Spike', 'Chore'] } },
    ],
    phases: [
      { name: 'Sprint', description: 'One sprint of work', order: 0, estimatedDurationDays: 14, reportingKey: 'SPRINT', docKeys: ['definition-of-done', 'getting-started-guide'] },
    ],
    // TC-FORMS: a story-intake form is NOTED-GAP — forms mechanics do not exist
    // yet (separate track); stories are seeded as tasks under epics for now.
    // Two epics, each with child stories via real parentage.
    taskTemplates: [
      { name: 'Epic: User Onboarding', description: 'Everything to sign up and get started', estimatedHours: 1, phaseOrder: 0, priority: 'high', key: 'epic-onboarding' },
      { name: 'Sign-up flow', description: 'Create an account', estimatedHours: 8, phaseOrder: 0, priority: 'high', parentKey: 'epic-onboarding', storyPoints: 5 },
      { name: 'Login flow', description: 'Authenticate and start a session', estimatedHours: 5, phaseOrder: 0, priority: 'high', parentKey: 'epic-onboarding', storyPoints: 3 },
      { name: 'Epic: Reporting', description: 'See results and export data', estimatedHours: 1, phaseOrder: 0, priority: 'high', key: 'epic-reporting' },
      { name: 'Dashboard view', description: 'Show key metrics', estimatedHours: 13, phaseOrder: 0, priority: 'medium', parentKey: 'epic-reporting', storyPoints: 8 },
      { name: 'Export a report', description: 'Download results as a file', estimatedHours: 8, phaseOrder: 0, priority: 'medium', parentKey: 'epic-reporting', storyPoints: 5 },
      { name: 'Sprint planning', description: 'Pick sprint goal and commit stories', estimatedHours: 2, phaseOrder: 0, priority: 'high' },
      { name: 'Daily standup', description: 'Sync on progress and blockers', estimatedHours: 1, phaseOrder: 0, priority: 'medium' },
      { name: 'Sprint review', description: 'Demo completed stories', estimatedHours: 2, phaseOrder: 0, priority: 'medium' },
      { name: 'Retrospective', description: 'Inspect and adapt', estimatedHours: 1, phaseOrder: 0, priority: 'medium' },
    ],
  },
  {
    name: 'Kanban Delivery Project',
    code: 'sw_kanban_delivery_v1',
    // T8 (TC-C2): continuous-flow board with a class-of-service field.
    description:
      'Pull work across a board with limits and class of service. No sprints.',
    purpose: 'Deliver continuously with flow limits.',
    category: 'Software Development',
    methodology: 'kanban',
    deliveryMethod: 'KANBAN',
    setup: 'Simple',
    packCode: 'kanban_flow',
    workTypeTags: ['software', 'kanban', 'flow', 'continuous'],
    defaultTabs: ['overview', 'board', 'tasks', 'documents'],
    defaultView: 'board', // Board default + List(tasks)
    defaultGovernanceFlags: KANBAN_GOV,
    columnConfig: KANBAN_COLUMNS, // wipLimit column ON
    statusGroups: [
      { statusKey: 'BACKLOG', displayName: 'Backlog', color: '#888780', order: 0, bucket: 'open', isDefault: true },
      { statusKey: 'READY', displayName: 'Ready', color: '#B0B0B0', order: 1, bucket: 'open' },
      { statusKey: 'IN_PROGRESS', displayName: 'In Progress', color: '#185FA5', order: 2, bucket: 'open' },
      { statusKey: 'DONE', displayName: 'Done', color: '#3B6D11', order: 3, bucket: 'done' },
    ],
    // Class of Service is a custom field. Story points / native columns via
    // columnConfig.
    customAttributes: [
      { key: 'kanban_class_of_service', label: 'Class of Service', dataType: 'single_select', options: { values: ['Standard', 'Expedite', 'Fixed Date', 'Intangible'] } },
    ],
    phases: [
      { name: 'Continuous Flow', description: 'Ongoing pull-based execution', order: 0, estimatedDurationDays: 90, reportingKey: 'FLOW', docKeys: ['getting-started-guide'] },
    ],
    // TC-WIP: WIP limit ("In Progress = 3") is a project workflow config
    // (ProjectWorkflowConfig.statusWipLimits), set post-instantiate by an admin
    // via the workflow-config endpoint. Templates cannot seed WIP limits yet —
    // NOTED-GAP for a mechanics micro-PR (wipConfig → instantiate seeder).
    taskTemplates: [
      { name: 'Map the workflow', description: 'Define columns and pull rules', estimatedHours: 2, phaseOrder: 0, priority: 'high', status: 'TODO' },
      { name: 'Set WIP limits', description: 'Agree limits per column (e.g. In Progress = 3)', estimatedHours: 1, phaseOrder: 0, priority: 'high', status: 'TODO' },
      { name: 'Define done criteria', description: 'Document what Done means', estimatedHours: 1, phaseOrder: 0, priority: 'medium', status: 'TODO' },
      { name: 'Pull first item', description: 'Start the highest-priority ready item', estimatedHours: 4, phaseOrder: 0, priority: 'high', status: 'IN_PROGRESS' },
      { name: 'Pull second item', description: 'Respect the WIP limit as you pull', estimatedHours: 4, phaseOrder: 0, priority: 'medium', status: 'IN_PROGRESS' },
      { name: 'Pull third item', description: 'Third in progress — at the limit now', estimatedHours: 4, phaseOrder: 0, priority: 'medium', status: 'IN_PROGRESS' },
      // Teaching row: a fourth In Progress item would exceed a limit of 3.
      { name: 'Fourth item (would exceed WIP)', description: 'Finish something before pulling this', estimatedHours: 4, phaseOrder: 0, priority: 'low', status: 'BACKLOG' },
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
    setup: 'Advanced', // TC-C3 (T12)
    defaultTabs: ['overview', 'plan', 'gantt', 'tasks', 'change-requests', 'documents', 'kpis', 'risks'],
    defaultGovernanceFlags: WATERFALL_GOV,
    columnConfig: WATERFALL_COLUMNS,
    // Release pack (F4): Rollback? ships LOCKED — a release must decide it.
    customAttributes: [
      { key: 'release_rollback_ready', label: 'Rollback?', dataType: 'boolean', locked: true },
    ],
    // Blueprint T12 phases: Plan / Build / Stabilize / Deploy / Hypercare.
    // Gate at the Stabilize → Deploy boundary.
    phases: [
      { name: 'Plan', description: 'Scope freeze, release notes, dependencies', order: 0, estimatedDurationDays: 5, reportingKey: 'PLAN', docKeys: ['release-checklist', 'getting-started-guide'] },
      { name: 'Build', description: 'Implement and integrate release scope', order: 1, estimatedDurationDays: 7, reportingKey: 'BUILD' },
      { name: 'Stabilize', description: 'QA pass, regression, performance', order: 2, estimatedDurationDays: 7, reportingKey: 'STABILIZE', gateKey: 'platform.gate.stabilize-to-deploy', docKeys: ['go-no-go'] },
      { name: 'Deploy', description: 'Staged rollout and monitoring', order: 3, estimatedDurationDays: 2, reportingKey: 'DEPLOY' },
      { name: 'Hypercare', description: 'Post-release support and stabilization', order: 4, estimatedDurationDays: 7, reportingKey: 'HYPERCARE', isMilestone: true },
    ],
    taskTemplates: [
      { name: 'Scope freeze', description: 'Lock release scope and document deferrals', estimatedHours: 4, phaseOrder: 0, priority: 'high' },
      { name: 'Release notes draft', description: 'Author customer-facing release notes', estimatedHours: 4, phaseOrder: 0, priority: 'high' },
      { name: 'Build release scope', description: 'Implement and integrate the release', estimatedHours: 24, phaseOrder: 1, priority: 'high' },
      { name: 'QA pass', description: 'Execute regression and smoke suites', estimatedHours: 16, phaseOrder: 2, priority: 'high' },
      { name: 'Go / No-Go review', description: 'Confirm readiness and rollback plan', estimatedHours: 2, phaseOrder: 2, priority: 'critical', isMilestone: true },
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
    setup: 'Standard', // TC-C3 (T14)
    defaultTabs: ['overview', 'tasks', 'board', 'documents', 'kpis'],
    defaultView: 'tasks',
    defaultGovernanceFlags: SCRUM_GOV, // iterations ON
    columnConfig: AGILE_COLUMNS,
    // Funnel: Backlog → Building → Testing → Validated.
    statusGroups: [
      { statusKey: 'BACKLOG', displayName: 'Backlog', color: '#888780', order: 0, bucket: 'open', isDefault: true },
      { statusKey: 'BUILDING', displayName: 'Building', color: '#185FA5', order: 1, bucket: 'open' },
      { statusKey: 'TESTING', displayName: 'Testing', color: '#534AB7', order: 2, bucket: 'open' },
      { statusKey: 'VALIDATED', displayName: 'Validated', color: '#3B6D11', order: 3, bucket: 'done' },
    ],
    // Hypothesis pack (F4).
    customAttributes: [
      { key: 'mvp_hypothesis', label: 'Hypothesis', dataType: 'long_text' },
      { key: 'mvp_riskiest_assumption', label: 'Riskiest Assumption', dataType: 'text' },
    ],
    phases: [
      { name: 'Discover', description: 'Hypotheses, riskiest assumption, success metric', order: 0, estimatedDurationDays: 3, reportingKey: 'DISCOVER', docKeys: ['getting-started-guide'] },
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
    setup: 'Standard', // TC-C3 (T16)
    defaultTabs: ['overview', 'tasks', 'board', 'kpis', 'risks', 'documents'],
    defaultGovernanceFlags: SCRUM_GOV,
    columnConfig: AGILE_COLUMNS,
    // GTM pack (F4): Channel + Segment.
    customAttributes: [
      { key: 'gtm_channel', label: 'Channel', dataType: 'single_select', options: { values: ['Email', 'Social', 'Paid', 'PR', 'Partner', 'Sales'] } },
      { key: 'gtm_segment', label: 'Segment', dataType: 'text' },
    ],
    // Blueprint T16 phases: Position / Prepare / Launch / Grow.
    phases: [
      { name: 'Position', description: 'Audience, message, channels, pricing', order: 0, estimatedDurationDays: 5, reportingKey: 'POSITION', docKeys: ['getting-started-guide'] },
      { name: 'Prepare', description: 'Landing, sales collateral, demo, FAQs', order: 1, estimatedDurationDays: 10, reportingKey: 'PREPARE' },
      { name: 'Launch', description: 'Go-live across selected channels', order: 2, estimatedDurationDays: 3, reportingKey: 'LAUNCH' },
      { name: 'Grow', description: 'Measure, learn, and adjust GTM', order: 3, estimatedDurationDays: 14, reportingKey: 'GROW' },
    ],
    taskTemplates: [
      { name: 'Positioning statement', description: 'Author the one-liner and audience map', estimatedHours: 4, phaseOrder: 0, priority: 'high' },
      { name: 'Channel plan', description: 'Pick 2–3 channels and define funnel', estimatedHours: 4, phaseOrder: 0, priority: 'high' },
      { name: 'Landing page', description: 'Build and ship the landing page', estimatedHours: 16, phaseOrder: 1, priority: 'high' },
      { name: 'Sales deck', description: 'Author the first pitch deck', estimatedHours: 8, phaseOrder: 1, priority: 'medium' },
      { name: 'Launch day', description: 'Sequence and run launch-day activities', estimatedHours: 4, phaseOrder: 2, priority: 'critical', isMilestone: true },
      { name: 'Weekly GTM review', description: 'Track signups, demos, conversion', estimatedHours: 1, phaseOrder: 3, priority: 'high' },
    ],
  },

  /* ═══ TC-C3 DOMAIN TIER — new: Bug & Issue Tracker (T10) ═════════════ */
  {
    name: 'Bug & Issue Tracker',
    code: 'bug_tracker_v1',
    description:
      'Triage, track, and resolve bugs on a board. Sorts noise from real work.',
    purpose: 'Triage and resolve bugs on a board.',
    category: 'Software Development',
    methodology: 'kanban',
    deliveryMethod: 'KANBAN',
    setup: 'Simple',
    packCode: 'none',
    workTypeTags: ['bug', 'issue', 'triage', 'support'],
    defaultTabs: ['overview', 'board', 'tasks', 'documents'],
    defaultView: 'board',
    defaultGovernanceFlags: KANBAN_GOV,
    columnConfig: KANBAN_COLUMNS,
    // Triage flow; Cannot Reproduce + Not a Bug land in the cancelled bucket.
    statusGroups: [
      { statusKey: 'NEW', displayName: 'New', color: '#888780', order: 0, bucket: 'open', isDefault: true },
      { statusKey: 'TRIAGED', displayName: 'Triaged', color: '#B0B0B0', order: 1, bucket: 'open' },
      { statusKey: 'IN_PROGRESS', displayName: 'In Progress', color: '#185FA5', order: 2, bucket: 'open' },
      { statusKey: 'FIXED', displayName: 'Fixed', color: '#3B6D11', order: 3, bucket: 'done' },
      { statusKey: 'CANNOT_REPRODUCE', displayName: 'Cannot Reproduce', color: '#888780', order: 4, bucket: 'cancelled' },
      { statusKey: 'NOT_A_BUG', displayName: 'Not a Bug', color: '#888780', order: 5, bucket: 'cancelled' },
    ],
    // Bug pack via F4: Severity + Reproducibility.
    customAttributes: [
      { key: 'bug_severity', label: 'Severity', dataType: 'single_select', options: { values: ['Critical', 'High', 'Medium', 'Low'] } },
      { key: 'bug_reproducibility', label: 'Reproducibility', dataType: 'single_select', options: { values: ['Always', 'Sometimes', 'Rarely', 'Unable'] } },
    ],
    phases: [
      { name: 'Triage', description: 'Incoming bugs and issues', order: 0, estimatedDurationDays: 90, reportingKey: 'TRIAGE', docKeys: ['getting-started-guide'] },
    ],
    // TC-FORMS: a bug-intake form is NOTED-GAP — forms mechanics do not exist
    // yet (separate track). Sample bugs are seeded as tasks for now.
    taskTemplates: [
      { name: 'Crash on save', description: 'App crashes when saving a large file', estimatedHours: 4, phaseOrder: 0, priority: 'critical', tags: ['crash'] },
      { name: 'Login fails intermittently', description: 'Some users cannot log in at times', estimatedHours: 4, phaseOrder: 0, priority: 'high', tags: ['auth'] },
      { name: 'Wrong total on report', description: 'Report sums the wrong column', estimatedHours: 3, phaseOrder: 0, priority: 'high', tags: ['reporting'] },
      { name: 'Slow page load', description: 'Dashboard takes too long to open', estimatedHours: 5, phaseOrder: 0, priority: 'medium', tags: ['performance'] },
      { name: 'Typo in email', description: 'Welcome email has a spelling error', estimatedHours: 1, phaseOrder: 0, priority: 'low', tags: ['content'] },
      { name: 'Cannot reproduce report', description: 'Reported issue does not reproduce', estimatedHours: 1, phaseOrder: 0, priority: 'low', tags: ['triage'] },
      { name: 'Feature request filed as bug', description: 'Actually an enhancement, not a defect', estimatedHours: 1, phaseOrder: 0, priority: 'low', tags: ['triage'] },
    ],
  },

  /* ═══ TC-C1 STARTER TIER (5) ═════════════════════════════════════════
   * Beginner-friendly shapes, each exercising the payload machinery.
   * Every Starter ships the getting-started-guide document. Task mechanics
   * (dependencies, parentage, custom fields) are real as of TC-C1c.
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
    // Real dependencies via dependsOn (keys → work_task_dependencies, FS).
    // TC-B7 (D3): startOffsetDays/durationDays give Gantt bars out of the box
    // (spans across the 3 phases; milestones are zero-duration markers).
    taskTemplates: [
      { name: 'Define scope', description: 'Agree on what is in and out', estimatedHours: 4, phaseOrder: 0, priority: 'high', key: 'define-scope', startOffsetDays: 0, durationDays: 3 },
      { name: 'Build the schedule', description: 'Lay out phases and dates', estimatedHours: 4, phaseOrder: 0, priority: 'high', key: 'schedule', startOffsetDays: 3, durationDays: 3 },
      // Real milestone (isMilestone → work_tasks.is_milestone).
      { name: 'Plan approved', description: 'Sign-off marks the plan complete', estimatedHours: 1, phaseOrder: 0, priority: 'high', isMilestone: true, key: 'plan-approved', dependsOn: ['define-scope', 'schedule'], startOffsetDays: 6, durationDays: 0 },
      { name: 'Start build', description: 'Begin execution once the plan is signed off', estimatedHours: 8, phaseOrder: 1, priority: 'high', key: 'start-build', dependsOn: ['plan-approved'], startOffsetDays: 7, durationDays: 7 },
      { name: 'Mid-build review', description: 'Check progress against the plan', estimatedHours: 2, phaseOrder: 1, priority: 'medium', key: 'mid-review', dependsOn: ['start-build'], startOffsetDays: 14, durationDays: 1 },
      { name: 'Finish build', description: 'Complete the execution work', estimatedHours: 8, phaseOrder: 1, priority: 'high', key: 'finish-build', dependsOn: ['start-build'], startOffsetDays: 15, durationDays: 13 },
      { name: 'Handover', description: 'Transfer deliverables to owners', estimatedHours: 2, phaseOrder: 2, priority: 'medium', key: 'handover', dependsOn: ['finish-build'], startOffsetDays: 28, durationDays: 3 },
      { name: 'Project complete', description: 'Final milestone: work delivered', estimatedHours: 1, phaseOrder: 2, priority: 'high', isMilestone: true, key: 'complete', dependsOn: ['handover'], startOffsetDays: 32, durationDays: 0 },
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
    // Story points real via storyPoints; Sprint-ready? + Type ship as custom
    // fields (customAttributes → project_attribute_definitions at instantiate).
    customAttributes: [
      { key: 'backlog_sprint_ready', label: 'Sprint-ready?', dataType: 'boolean' },
      { key: 'backlog_type', label: 'Type', dataType: 'single_select', options: { values: ['Feature', 'Bug', 'Chore', 'Spike'] } },
    ],
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

  // ── T5 — WBS (real parent/child hierarchy via parentKey) ────────────
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
    // Real parent/child hierarchy (parentKey → work_tasks.parent_task_id).
    // Three parent workstreams, each with three children.
    taskTemplates: [
      { name: 'Plan', description: 'Planning workstream', estimatedHours: 1, phaseOrder: 0, priority: 'high', key: 'plan' },
      { name: 'Define goals', description: 'Set the objectives', estimatedHours: 4, phaseOrder: 0, priority: 'medium', parentKey: 'plan' },
      { name: 'Identify risks', description: 'List what could go wrong', estimatedHours: 4, phaseOrder: 0, priority: 'medium', parentKey: 'plan' },
      { name: 'Set the schedule', description: 'Lay out the timeline', estimatedHours: 4, phaseOrder: 0, priority: 'medium', parentKey: 'plan' },
      { name: 'Build', description: 'Build workstream', estimatedHours: 1, phaseOrder: 1, priority: 'high', key: 'build' },
      { name: 'Design', description: 'Design the solution', estimatedHours: 8, phaseOrder: 1, priority: 'medium', parentKey: 'build' },
      { name: 'Develop', description: 'Build the solution', estimatedHours: 16, phaseOrder: 1, priority: 'high', parentKey: 'build' },
      { name: 'Test', description: 'Verify it works', estimatedHours: 8, phaseOrder: 1, priority: 'medium', parentKey: 'build' },
      { name: 'Close', description: 'Closeout workstream', estimatedHours: 1, phaseOrder: 2, priority: 'high', key: 'close' },
      { name: 'Review', description: 'Review the outcome', estimatedHours: 4, phaseOrder: 2, priority: 'medium', parentKey: 'close' },
      { name: 'Document', description: 'Write up the results', estimatedHours: 4, phaseOrder: 2, priority: 'low', parentKey: 'close' },
      { name: 'Handover', description: 'Transfer to owners', estimatedHours: 4, phaseOrder: 2, priority: 'medium', parentKey: 'close' },
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
  // TC-C2 (T6): pm_agile_v1 retired — absorbed into sw_scrum_delivery_v1.
  // Deactivated here (re-seed sets is_active=false); staging row archived.
  'pm_hybrid_v1',
  'sw_scrum_delivery_v1',
  'sw_kanban_delivery_v1',
  'sw_release_planning_v1',
  'bug_tracker_v1', // TC-C3 (T10)
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

export function isTemplateComingSoon(
  code: string | null | undefined,
  kind?: string | null,
): boolean {
  // TC-B7 (#8): kind='document' rows are live catalog citizens (seeded via the
  // document catalog, template_code `doc.*`), never coming-soon. The
  // coming-soon gate applies only to project/methodology template codes.
  if (kind === 'document') return false;
  if (!code) return false;
  return !ACTIVE_TEMPLATE_CODES.has(code);
}