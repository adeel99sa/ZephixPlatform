/**
 * B-7 Template Library seed data — UI-only; no API persistence.
 * Aligns with Policy Engine governance levels (display labels).
 */

export type TemplateCategoryFilter = "all" | "Delivery" | "Product" | "PMO";
export type TemplateCategory = "Delivery" | "Product" | "PMO";

/** Display-only labels. Technical `category` field values remain `Delivery` | `Product` | `PMO`. */
export const TEMPLATE_CATEGORY_DISPLAY_LABELS: Record<TemplateCategory, string> = {
  Delivery: "Delivery",
  Product: "Product",
  PMO: "Portfolio & Governance",
};

export type TemplatePublishState = "draft" | "published" | "deprecated";
export type GovernanceLevelLabel = "Execution" | "Structured" | "Governed";

export type TabKey =
  | "overview"
  | "tasks"
  | "docs"
  | "risks"
  | "resources"
  | "dashboard";

export type TabPresence = "required" | "optional" | "locked";

export type FieldBinding = {
  id: string;
  label: string;
  presence: TabPresence;
};

export type GateDefinition = {
  id: string;
  name: string;
  enabled: boolean;
  required: boolean;
  approverRoles: ApproverRole[];
};

export type ApproverRole =
  | "pmo_admin"
  | "project_manager"
  | "workspace_admin"
  | "sponsor"
  | "delivery_lead";

export const APPROVER_ROLE_LABELS: Record<ApproverRole, string> = {
  pmo_admin: "Governance Admin",
  project_manager: "Project Manager",
  workspace_admin: "Workspace Owner",
  sponsor: "Sponsor",
  delivery_lead: "Delivery Lead",
};

export type ArtifactPackKey =
  | "charter"
  | "project_plan"
  | "risk_register"
  | "lessons_learned"
  | "closure"
  | "release_notes"
  | "test_plan"
  | "architecture"
  | "raid_log";

export const ARTIFACT_LABELS: Record<ArtifactPackKey, string> = {
  charter: "Charter",
  project_plan: "Project Plan",
  risk_register: "Risk Register",
  lessons_learned: "Lessons Learned",
  closure: "Closure",
  release_notes: "Release Notes",
  test_plan: "Test Plan",
  architecture: "Architecture",
  raid_log: "RAID Log",
};

export type ArtifactRule = {
  key: ArtifactPackKey;
  presence: "required_before_gate" | "optional" | "hidden";
};

export type TemplateUpdateBehavior =
  | "manual_review"
  | "auto_apply_non_destructive"
  | "strict_sync";

export type CoreTemplateDefinition = {
  id: string;
  name: string;
  category: TemplateCategory;
  methodology: string;
  governanceLevel: GovernanceLevelLabel;
  publishState: TemplatePublishState;
  version: string;
  lastUpdated: string;
  lastEditor: string;
  lastPublishedAt: string | null;
  description: string;
  defaultTabs: TabKey[];
  tabRules: Partial<Record<TabKey, TabPresence>>;
  statuses: string[];
  defaultFields: FieldBinding[];
  phases: string[];
  gates: GateDefinition[];
  recycleLimit: number;
  multiLevelApprovals: boolean;
  artifacts: ArtifactRule[];
  baseWorkflowId: "task_default" | "risk_default" | "custom";
  optionalArtifactPacks: string[];
};

const TAB = {
  overview: "overview" as const,
  tasks: "tasks" as const,
  docs: "docs" as const,
  risks: "risks" as const,
  resources: "resources" as const,
  dashboard: "dashboard" as const,
};

function f(
  id: string,
  label: string,
  presence: TabPresence = "optional",
): FieldBinding {
  return { id, label, presence };
}

export const CORE_TEMPLATES: CoreTemplateDefinition[] = [
  {
    id: "simple-project",
    name: "Simple Project",
    category: "Delivery",
    methodology: "Simple",
    governanceLevel: "Execution",
    publishState: "published",
    version: "1.2",
    lastUpdated: "2026-03-01",
    lastEditor: "Sarah Connor",
    lastPublishedAt: "2026-02-28",
    description: "Lightweight delivery for small initiatives.",
    defaultTabs: [TAB.overview, TAB.tasks],
    tabRules: {
      overview: "required",
      tasks: "required",
      docs: "optional",
      dashboard: "optional",
    },
    statuses: ["TODO", "IN_PROGRESS", "DONE"],
    defaultFields: [f("priority", "Priority"), f("assignee", "Assignee")],
    phases: [],
    gates: [],
    recycleLimit: 3,
    multiLevelApprovals: false,
    artifacts: [],
    baseWorkflowId: "task_default",
    optionalArtifactPacks: [],
  },
  {
    id: "kanban-delivery",
    name: "Kanban Delivery",
    category: "Delivery",
    methodology: "Kanban",
    governanceLevel: "Execution",
    publishState: "published",
    version: "1.1",
    lastUpdated: "2026-03-10",
    lastEditor: "John Smith",
    lastPublishedAt: "2026-03-08",
    description: "Flow-based delivery with WIP-friendly statuses.",
    defaultTabs: [TAB.overview, TAB.tasks, TAB.dashboard],
    tabRules: {
      overview: "required",
      tasks: "required",
      dashboard: "required",
      docs: "optional",
    },
    statuses: ["Backlog", "To Do", "In Progress", "Review", "Done"],
    defaultFields: [
      f("priority", "Priority", "required"),
      f("assignee", "Assignee", "required"),
      f("due_date", "Due Date", "required"),
      f("tags", "Tags", "optional"),
    ],
    phases: [],
    gates: [],
    recycleLimit: 3,
    multiLevelApprovals: false,
    artifacts: [],
    baseWorkflowId: "task_default",
    optionalArtifactPacks: [],
  },
  {
    id: "scrum-sprint-delivery",
    name: "Scrum Sprint Delivery",
    category: "Delivery",
    methodology: "Agile Scrum",
    governanceLevel: "Structured",
    publishState: "published",
    version: "2.0",
    lastUpdated: "2026-03-18",
    lastEditor: "Sarah Connor",
    lastPublishedAt: "2026-03-15",
    description: "Sprint-based delivery with backlog orientation.",
    defaultTabs: [TAB.overview, TAB.tasks, TAB.dashboard, TAB.docs],
    tabRules: {
      overview: "required",
      tasks: "required",
      dashboard: "required",
      docs: "optional",
      risks: "optional",
    },
    statuses: [
      "New",
      "Ready",
      "In Sprint",
      "In Progress",
      "In Review",
      "Done",
    ],
    defaultFields: [
      f("story_points", "Story Points", "required"),
      f("sprint", "Sprint", "required"),
      f("epic", "Epic", "optional"),
      f("ac", "Acceptance Criteria", "required"),
      f("priority", "Priority", "required"),
    ],
    phases: [],
    gates: [],
    recycleLimit: 3,
    multiLevelApprovals: false,
    artifacts: [
      { key: "release_notes", presence: "optional" },
      { key: "test_plan", presence: "optional" },
    ],
    baseWorkflowId: "task_default",
    optionalArtifactPacks: ["Sprint Goal", "Retrospective"],
  },
  {
    id: "waterfall-phase-gate",
    name: "Waterfall Phase-Gate",
    category: "Delivery",
    methodology: "Waterfall",
    governanceLevel: "Governed",
    publishState: "published",
    version: "3.1",
    lastUpdated: "2026-03-20",
    lastEditor: "Jordan Lee",
    lastPublishedAt: "2026-03-19",
    description: "Sequential phases with formal gate reviews.",
    defaultTabs: [TAB.overview, TAB.tasks, TAB.docs, TAB.risks, TAB.dashboard],
    tabRules: {
      overview: "required",
      tasks: "required",
      docs: "required",
      risks: "required",
      dashboard: "locked",
    },
    statuses: ["Not Started", "In Progress", "Complete", "On Hold"],
    defaultFields: [f("owner", "Owner", "required")],
    phases: ["Initiation", "Planning", "Execution", "Closing"],
    gates: [
      {
        id: "g1",
        name: "Initiation Review",
        enabled: true,
        required: true,
        approverRoles: ["pmo_admin", "project_manager"],
      },
      {
        id: "g2",
        name: "Planning Review",
        enabled: true,
        required: true,
        approverRoles: ["pmo_admin", "sponsor"],
      },
      {
        id: "g3",
        name: "Execution Review",
        enabled: true,
        required: true,
        approverRoles: ["pmo_admin", "delivery_lead"],
      },
      {
        id: "g4",
        name: "Closure Review",
        enabled: true,
        required: true,
        approverRoles: ["pmo_admin", "sponsor"],
      },
    ],
    recycleLimit: 2,
    multiLevelApprovals: true,
    artifacts: [
      { key: "charter", presence: "required_before_gate" },
      { key: "project_plan", presence: "required_before_gate" },
      { key: "risk_register", presence: "required_before_gate" },
      { key: "closure", presence: "required_before_gate" },
    ],
    baseWorkflowId: "task_default",
    optionalArtifactPacks: [],
  },
  {
    id: "hybrid-delivery",
    name: "Hybrid Delivery",
    category: "Delivery",
    methodology: "Hybrid",
    governanceLevel: "Structured",
    publishState: "published",
    version: "1.4",
    lastUpdated: "2026-03-12",
    lastEditor: "Alex Rivera",
    lastPublishedAt: "2026-03-10",
    description: "Blend discovery, planning, iterative delivery, and closure.",
    defaultTabs: [TAB.overview, TAB.tasks, TAB.docs, TAB.risks, TAB.dashboard],
    tabRules: {
      overview: "required",
      tasks: "required",
      docs: "optional",
      risks: "optional",
      dashboard: "optional",
    },
    statuses: ["Planned", "Ready", "In Progress", "Review", "Done"],
    defaultFields: [f("priority", "Priority", "required")],
    phases: ["Discovery", "Planning", "Iterative Delivery", "Validation", "Closure"],
    gates: [
      {
        id: "hg1",
        name: "Planning Gate",
        enabled: true,
        required: false,
        approverRoles: ["project_manager", "workspace_admin"],
      },
      {
        id: "hg2",
        name: "Release Gate",
        enabled: true,
        required: false,
        approverRoles: ["pmo_admin", "delivery_lead"],
      },
    ],
    recycleLimit: 3,
    multiLevelApprovals: false,
    artifacts: [{ key: "project_plan", presence: "optional" }],
    baseWorkflowId: "task_default",
    optionalArtifactPacks: [],
  },
  {
    id: "sdlc-software-delivery",
    name: "SDLC Software Delivery",
    category: "Delivery",
    methodology: "SDLC",
    governanceLevel: "Governed",
    publishState: "published",
    version: "2.3",
    lastUpdated: "2026-03-22",
    lastEditor: "Priya Singh",
    lastPublishedAt: "2026-03-21",
    description: "Software lifecycle with engineering artifacts and approvals.",
    defaultTabs: [TAB.overview, TAB.tasks, TAB.docs, TAB.risks, TAB.dashboard],
    tabRules: {
      overview: "required",
      tasks: "required",
      docs: "required",
      risks: "required",
      dashboard: "required",
    },
    statuses: [
      "Requirements",
      "Design",
      "Development",
      "Testing",
      "Deployment",
      "Maintenance",
    ],
    defaultFields: [f("component", "Component", "optional")],
    phases: ["Requirements", "Design", "Build", "Test", "Release"],
    gates: [
      {
        id: "sg1",
        name: "Design Approval",
        enabled: true,
        required: true,
        approverRoles: ["project_manager", "delivery_lead"],
      },
      {
        id: "sg2",
        name: "Release Approval",
        enabled: true,
        required: true,
        approverRoles: ["pmo_admin", "sponsor"],
      },
    ],
    recycleLimit: 2,
    multiLevelApprovals: true,
    artifacts: [
      { key: "project_plan", presence: "required_before_gate" },
      { key: "architecture", presence: "required_before_gate" },
      { key: "test_plan", presence: "required_before_gate" },
      { key: "release_notes", presence: "required_before_gate" },
    ],
    baseWorkflowId: "task_default",
    optionalArtifactPacks: [],
  },
  {
    id: "product-backlog",
    name: "Product Backlog",
    category: "Product",
    methodology: "Agile",
    governanceLevel: "Structured",
    publishState: "published",
    version: "1.0",
    lastUpdated: "2026-03-05",
    lastEditor: "Morgan Lee",
    lastPublishedAt: "2026-03-01",
    description: "Prioritized backlog with value and release targeting.",
    defaultTabs: [TAB.overview, TAB.tasks, TAB.dashboard],
    tabRules: {
      overview: "required",
      tasks: "required",
      dashboard: "optional",
    },
    statuses: ["Proposed", "Ready", "In Progress", "Review", "Done"],
    defaultFields: [
      f("story_points", "Story Points", "optional"),
      f("business_value", "Business Value", "required"),
      f("epic", "Epic", "optional"),
      f("priority", "Priority", "required"),
      f("release_target", "Release Target", "optional"),
    ],
    phases: [],
    gates: [],
    recycleLimit: 3,
    multiLevelApprovals: false,
    artifacts: [],
    baseWorkflowId: "task_default",
    optionalArtifactPacks: [],
  },
  {
    id: "product-roadmap",
    name: "Product Roadmap",
    category: "Product",
    methodology: "Agile Product",
    governanceLevel: "Structured",
    publishState: "draft",
    version: "0.9",
    lastUpdated: "2026-03-24",
    lastEditor: "Morgan Lee",
    lastPublishedAt: null,
    description: "Theme-based roadmap with confidence and investment framing.",
    defaultTabs: [TAB.overview, TAB.dashboard, TAB.docs],
    tabRules: {
      overview: "required",
      dashboard: "required",
      docs: "optional",
    },
    statuses: ["Research", "Planning", "In Development", "Beta", "Released"],
    defaultFields: [
      f("goal", "Goal", "required"),
      f("audience", "Target Audience", "optional"),
      f("confidence", "Confidence", "optional"),
      f("investment", "Investment Level", "optional"),
      f("dependencies", "Dependencies", "optional"),
    ],
    phases: [],
    gates: [],
    recycleLimit: 3,
    multiLevelApprovals: false,
    artifacts: [],
    baseWorkflowId: "task_default",
    optionalArtifactPacks: [],
  },
  {
    id: "risk-register",
    name: "Risk Register",
    category: "PMO",
    methodology: "Risk",
    governanceLevel: "Structured",
    publishState: "published",
    version: "1.5",
    lastUpdated: "2026-03-14",
    lastEditor: "Morgan Reeves",
    lastPublishedAt: "2026-03-12",
    description: "Enterprise risk tracking with scoring and mitigation.",
    defaultTabs: [TAB.overview, TAB.risks, TAB.dashboard],
    tabRules: {
      overview: "required",
      risks: "required",
      dashboard: "required",
    },
    statuses: [
      "Identified",
      "Mitigating",
      "Monitoring",
      "Escalated",
      "Closed",
    ],
    defaultFields: [
      f("probability", "Probability", "required"),
      f("impact", "Impact", "required"),
      f("score", "Risk Score", "optional"),
      f("owner", "Owner", "required"),
      f("mitigation", "Mitigation", "optional"),
      f("financial", "Financial Impact", "optional"),
    ],
    phases: [],
    gates: [],
    recycleLimit: 3,
    multiLevelApprovals: false,
    artifacts: [{ key: "risk_register", presence: "required_before_gate" }],
    baseWorkflowId: "risk_default",
    optionalArtifactPacks: [],
  },
  {
    id: "resource-capacity-plan",
    name: "Resource Capacity Plan",
    category: "PMO",
    methodology: "Capacity",
    governanceLevel: "Structured",
    publishState: "published",
    version: "1.3",
    lastUpdated: "2026-03-08",
    lastEditor: "Alex Rivera",
    lastPublishedAt: "2026-03-07",
    description: "Cross-project capacity and utilization visibility.",
    defaultTabs: [TAB.overview, TAB.resources, TAB.dashboard],
    tabRules: {
      overview: "required",
      resources: "required",
      dashboard: "required",
    },
    statuses: [
      "Available",
      "Fully Allocated",
      "Overallocated",
      "Underutilized",
    ],
    defaultFields: [
      f("role", "Role", "required"),
      f("avail_hrs", "Available Hours", "required"),
      f("alloc_hrs", "Allocated Hours", "required"),
      f("util", "Utilization", "optional"),
      f("cost_rate", "Cost Rate", "optional"),
    ],
    phases: [],
    gates: [],
    recycleLimit: 3,
    multiLevelApprovals: false,
    artifacts: [],
    baseWorkflowId: "task_default",
    optionalArtifactPacks: [],
  },
  {
    id: "project-status-report",
    name: "Project Status Report",
    category: "PMO",
    methodology: "Reporting",
    governanceLevel: "Structured",
    publishState: "published",
    version: "1.0",
    lastUpdated: "2026-02-20",
    lastEditor: "Sarah Connor",
    lastPublishedAt: "2026-02-18",
    description: "Executive RAG-style status with variance and milestones.",
    defaultTabs: [TAB.overview, TAB.dashboard, TAB.docs],
    tabRules: {
      overview: "required",
      dashboard: "required",
      docs: "optional",
    },
    statuses: ["Green", "Amber", "Red", "Blocked"],
    defaultFields: [
      f("budget_var", "Budget Variance", "required"),
      f("sched_var", "Schedule Variance", "required"),
      f("top_risks", "Top Risks", "required"),
      f("exec_sum", "Executive Summary", "required"),
      f("milestones", "Milestones", "optional"),
    ],
    phases: [],
    gates: [],
    recycleLimit: 3,
    multiLevelApprovals: false,
    artifacts: [],
    baseWorkflowId: "task_default",
    optionalArtifactPacks: [],
  },
  {
    id: "raci-matrix",
    name: "RACI Matrix",
    category: "PMO",
    methodology: "Governance",
    governanceLevel: "Structured",
    publishState: "deprecated",
    version: "0.8",
    lastUpdated: "2025-11-01",
    lastEditor: "Legacy Import",
    lastPublishedAt: "2025-10-15",
    description: "Role clarity for deliverables and decisions.",
    defaultTabs: [TAB.overview, TAB.docs],
    tabRules: {
      overview: "required",
      docs: "required",
    },
    statuses: ["Draft", "Defined", "Approved", "Active", "Complete"],
    defaultFields: [
      f("r", "Responsible", "required"),
      f("a", "Accountable", "required"),
      f("c", "Consulted", "optional"),
      f("i", "Informed", "optional"),
    ],
    phases: [],
    gates: [],
    recycleLimit: 3,
    multiLevelApprovals: false,
    artifacts: [],
    baseWorkflowId: "task_default",
    optionalArtifactPacks: [],
  },
];

export function getTemplateById(id: string): CoreTemplateDefinition | undefined {
  return CORE_TEMPLATES.find((t) => t.id === id);
}

export const TAB_LABELS: Record<TabKey, string> = {
  overview: "Overview",
  tasks: "Tasks",
  docs: "Docs",
  risks: "Risks",
  resources: "Resources",
  dashboard: "Dashboard",
};

export const WORKFLOW_OPTIONS: { id: CoreTemplateDefinition["baseWorkflowId"]; label: string }[] =
  [
    { id: "task_default", label: "Task workflow (B-6 default)" },
    { id: "risk_default", label: "Risk workflow (B-6 default)" },
    { id: "custom", label: "Custom list (this template only)" },
  ];
