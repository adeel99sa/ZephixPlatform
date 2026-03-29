import { useEffect, useMemo, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Check, Filter, Layers, Search, X } from "lucide-react";

import { listWorkspaces, type Workspace } from "@/features/workspaces/api";
import { getTemplateDetail, listTemplates } from "@/features/templates/api";
import type {
  CanonicalTemplate,
  TemplateImportOptions,
} from "@/features/templates/types";
import type { TemplateLike } from "@/features/templates/lib/templateGalleryModel";
import { useTemplateCreation } from "@/features/templates/hooks/useTemplateCreation";
import { TemplateCenterCard } from "@/features/templates/components/TemplateCenterCard";

type Step = "catalog" | "import";

type ProjectTemplateCenterModalProps = {
  open: boolean;
  initialWorkspaceId?: string;
  onClose: () => void;
  onSuccess: (result: { projectId: string; workspaceId?: string }) => void;
};

/** Built-in catalog categories (subset of API categories). */
type BuiltInCategory =
  | "Project Management"
  | "Software Development"
  | "Product Management"
  | "Operations";

type ModalTemplateCategory =
  | BuiltInCategory
  | "Marketing"
  | "HR";

type CatalogSidebarKey =
  | "recommended"
  | "org"
  | "general_pm"
  | "general_sd"
  | "general_product"
  | "general_ops"
  | "general_marketing"
  | "general_hr";

const GENERAL_SIDEBAR: { id: CatalogSidebarKey; label: string }[] = [
  { id: "general_pm", label: "Project Management" },
  { id: "general_sd", label: "Software Development" },
  { id: "general_product", label: "Product Management" },
  { id: "general_ops", label: "Operations" },
  { id: "general_marketing", label: "Marketing" },
  { id: "general_hr", label: "HR" },
];

const SIDEBAR_BREADCRUMB: Record<CatalogSidebarKey, string> = {
  recommended: "Recommended for you",
  org: "Created by my organization",
  general_pm: "General templates | Project Management",
  general_sd: "General templates | Software Development",
  general_product: "General templates | Product Management",
  general_ops: "General templates | Operations",
  general_marketing: "General templates | Marketing",
  general_hr: "General templates | HR",
};

const GENERAL_KEY_TO_CATEGORY: Record<
  Exclude<CatalogSidebarKey, "recommended" | "org">,
  ModalTemplateCategory
> = {
  general_pm: "Project Management",
  general_sd: "Software Development",
  general_product: "Product Management",
  general_ops: "Operations",
  general_marketing: "Marketing",
  general_hr: "HR",
};

// ── Built-in template definitions (always available) ──────────────────────

type BuiltInTemplate = {
  id: string;
  name: string;
  description: string;
  category: BuiltInCategory;
  complexity: "low" | "medium" | "high";
  methodology: string;
  phases: Array<{ name: string; order: number; estimatedDurationDays?: number }>;
  taskCount: number;
  statuses: string[];
  views: string[];
  fields: string[];
  isBuiltIn: true;
};

const BUILT_IN_TEMPLATES: BuiltInTemplate[] = [
  {
    id: "builtin-waterfall-pm",
    name: "Waterfall Project Management",
    description:
      "Traditional waterfall methodology with sequential phases — ideal for fixed-scope, regulated, or compliance-driven projects.",
    category: "Project Management",
    complexity: "high",
    methodology: "Waterfall",
    phases: [
      { name: "Ideation", order: 0, estimatedDurationDays: 7 },
      { name: "Research", order: 1, estimatedDurationDays: 14 },
      { name: "Design", order: 2, estimatedDurationDays: 21 },
      { name: "Development", order: 3, estimatedDurationDays: 60 },
      { name: "Testing & Evaluation", order: 4, estimatedDurationDays: 21 },
      { name: "Finalization", order: 5, estimatedDurationDays: 7 },
      { name: "Application & Deployment", order: 6, estimatedDurationDays: 7 },
    ],
    taskCount: 15,
    statuses: ["TO DO", "IN PROGRESS", "NEEDS INPUT", "STUCK", "DONE"],
    views: ["List", "Board", "Gantt"],
    fields: ["Status", "Assignee", "Priority", "Due Date", "Phase"],
    isBuiltIn: true,
  },
  {
    id: "builtin-cross-functional",
    name: "Cross Functional Project Plan",
    description:
      "Structured project plan with requirements, design, implementation, testing, and deployment phases.",
    category: "Project Management",
    complexity: "high",
    methodology: "Waterfall",
    phases: [
      { name: "Requirements", order: 0, estimatedDurationDays: 14 },
      { name: "Design", order: 1, estimatedDurationDays: 21 },
      { name: "Implementation", order: 2, estimatedDurationDays: 60 },
      { name: "Testing", order: 3, estimatedDurationDays: 21 },
      { name: "Deployment", order: 4, estimatedDurationDays: 7 },
    ],
    taskCount: 15,
    statuses: ["BACKLOG", "TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW", "DONE"],
    views: ["List", "Board", "Gantt"],
    fields: ["Status", "Assignee", "Priority", "Due Date", "Phase", "Budget"],
    isBuiltIn: true,
  },
  {
    id: "builtin-project-deliverables",
    name: "Project Deliverables",
    description:
      "Milestone and deliverable-oriented template for fixed-scope projects with clear acceptance criteria.",
    category: "Project Management",
    complexity: "medium",
    methodology: "Waterfall",
    phases: [
      { name: "Plan Deliverables", order: 0, estimatedDurationDays: 7 },
      { name: "Build Deliverables", order: 1, estimatedDurationDays: 21 },
      { name: "Validate Deliverables", order: 2, estimatedDurationDays: 7 },
      { name: "Handover", order: 3, estimatedDurationDays: 3 },
    ],
    taskCount: 3,
    statuses: ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"],
    views: ["List", "Board"],
    fields: ["Status", "Assignee", "Priority", "Due Date"],
    isBuiltIn: true,
  },
  {
    id: "builtin-simple-tracker",
    name: "Simple Task Tracker",
    description:
      "Lightweight task tracking for small teams and fast project setup. Get started in minutes.",
    category: "Project Management",
    complexity: "low",
    methodology: "Kanban",
    phases: [
      { name: "To Do", order: 0 },
      { name: "In Progress", order: 1 },
      { name: "Done", order: 2 },
    ],
    taskCount: 3,
    statuses: ["TODO", "IN_PROGRESS", "DONE"],
    views: ["List", "Board"],
    fields: ["Status", "Assignee", "Priority"],
    isBuiltIn: true,
  },
  {
    id: "builtin-agile-delivery",
    name: "Agile Delivery",
    description:
      "Complete Agile/Scrum template with sprints, standups, backlog grooming, and retrospectives.",
    category: "Software Development",
    complexity: "medium",
    methodology: "Agile / Scrum",
    phases: [
      { name: "Sprint Planning", order: 0, estimatedDurationDays: 1 },
      { name: "Development", order: 1, estimatedDurationDays: 10 },
      { name: "Testing", order: 2, estimatedDurationDays: 3 },
      { name: "Review & Retrospective", order: 3, estimatedDurationDays: 1 },
    ],
    taskCount: 11,
    statuses: ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"],
    views: ["Board", "List"],
    fields: ["Status", "Assignee", "Story Points", "Sprint", "Priority"],
    isBuiltIn: true,
  },
  {
    id: "builtin-kanban-dev",
    name: "Kanban Development",
    description:
      "Continuous flow workflow with WIP limits, daily reviews, and flow metrics for dev teams.",
    category: "Software Development",
    complexity: "low",
    methodology: "Kanban",
    phases: [
      { name: "Backlog", order: 0 },
      { name: "In Progress", order: 1 },
      { name: "Testing", order: 2 },
      { name: "Done", order: 3 },
    ],
    taskCount: 5,
    statuses: ["BACKLOG", "TODO", "IN_PROGRESS", "BLOCKED", "DONE"],
    views: ["Board", "List"],
    fields: ["Status", "Assignee", "Priority", "WIP Limit"],
    isBuiltIn: true,
  },
  {
    id: "builtin-product-discovery",
    name: "Product Discovery",
    description:
      "Research-driven product discovery with user interviews, opportunity mapping, and hypothesis testing.",
    category: "Product Management",
    complexity: "medium",
    methodology: "Lean",
    phases: [
      { name: "Research", order: 0, estimatedDurationDays: 14 },
      { name: "Ideation", order: 1, estimatedDurationDays: 7 },
      { name: "Validation", order: 2, estimatedDurationDays: 14 },
      { name: "Definition", order: 3, estimatedDurationDays: 7 },
    ],
    taskCount: 8,
    statuses: ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"],
    views: ["List", "Board"],
    fields: ["Status", "Assignee", "Priority", "Hypothesis", "Impact"],
    isBuiltIn: true,
  },
  {
    id: "builtin-product-roadmap",
    name: "Product Roadmap",
    description:
      "Quarterly product roadmap with themes, initiatives, and feature prioritization using RICE scoring.",
    category: "Product Management",
    complexity: "high",
    methodology: "Roadmap",
    phases: [
      { name: "Q1 Planning", order: 0, estimatedDurationDays: 90 },
      { name: "Q2 Planning", order: 1, estimatedDurationDays: 90 },
      { name: "Q3 Planning", order: 2, estimatedDurationDays: 90 },
      { name: "Q4 Planning", order: 3, estimatedDurationDays: 90 },
    ],
    taskCount: 12,
    statuses: ["PROPOSED", "COMMITTED", "IN_PROGRESS", "SHIPPED"],
    views: ["List", "Gantt"],
    fields: ["Status", "Owner", "Theme", "RICE Score", "Quarter"],
    isBuiltIn: true,
  },
  {
    id: "builtin-ops-runbook",
    name: "Operations Runbook",
    description:
      "Standardized operational procedures with checklists, escalation paths, and post-incident reviews.",
    category: "Operations",
    complexity: "medium",
    methodology: "ITIL",
    phases: [
      { name: "Preparation", order: 0, estimatedDurationDays: 3 },
      { name: "Execution", order: 1, estimatedDurationDays: 7 },
      { name: "Verification", order: 2, estimatedDurationDays: 2 },
      { name: "Closeout", order: 3, estimatedDurationDays: 1 },
    ],
    taskCount: 6,
    statuses: ["PENDING", "IN_PROGRESS", "BLOCKED", "DONE"],
    views: ["List", "Board"],
    fields: ["Status", "Assignee", "Priority", "SLA", "Escalation"],
    isBuiltIn: true,
  },
  {
    id: "builtin-change-management",
    name: "Change Management",
    description:
      "Structured change management with impact assessment, approvals, rollback planning, and stakeholder communication.",
    category: "Operations",
    complexity: "high",
    methodology: "ITIL",
    phases: [
      { name: "Request & Assessment", order: 0, estimatedDurationDays: 5 },
      { name: "Planning & Approval", order: 1, estimatedDurationDays: 7 },
      { name: "Implementation", order: 2, estimatedDurationDays: 14 },
      { name: "Review & Close", order: 3, estimatedDurationDays: 3 },
    ],
    taskCount: 8,
    statuses: ["DRAFT", "PENDING_APPROVAL", "APPROVED", "IN_PROGRESS", "DONE"],
    views: ["List", "Board"],
    fields: ["Status", "Assignee", "Risk Level", "Impact", "Approver"],
    isBuiltIn: true,
  },
];

const DEFAULT_IMPORT: TemplateImportOptions = {
  includeViews: true,
  includeTasks: true,
  includePhases: true,
  includeMilestones: true,
  includeCustomFields: false,
  includeDependencies: false,
  remapDates: true,
};

function mergeTemplates(
  apiTemplates: CanonicalTemplate[],
  builtIns: BuiltInTemplate[],
): (CanonicalTemplate | BuiltInTemplate)[] {
  const apiNames = new Set(apiTemplates.map((t) => t.name.toLowerCase()));
  const unique = builtIns.filter((b) => !apiNames.has(b.name.toLowerCase()));
  return [...apiTemplates, ...unique];
}

function getTemplateCategory(
  t: CanonicalTemplate | BuiltInTemplate,
): ModalTemplateCategory {
  if ("isBuiltIn" in t) return t.category;
  if (t.category === "Start From Scratch") return "Project Management";
  if (t.category === "Project Management") return "Project Management";
  if (t.category === "Software Development") return "Software Development";
  if (t.category === "Product Management") return "Product Management";
  if (t.category === "Operations") return "Operations";
  if (t.category === "Manufacturing") return "Operations";
  if (t.category === "Marketing") return "Marketing";
  if (t.category === "HR") return "HR";
  return "Project Management";
}

const GOVERNED_HERO_IDS = new Set([
  "builtin-waterfall-pm",
  "builtin-agile-delivery",
  "builtin-cross-functional",
  "builtin-project-deliverables",
]);

const GOVERNED_HERO_NAME_SUBSTR = [
  "waterfall project management",
  "agile delivery",
  "cross functional project",
  "project deliverables",
];

function isGovernedHero(t: CanonicalTemplate | BuiltInTemplate): boolean {
  if (GOVERNED_HERO_IDS.has(t.id)) return true;
  const n = t.name.trim().toLowerCase();
  return GOVERNED_HERO_NAME_SUBSTR.some((s) => n.includes(s));
}

function isStrictGovernance(t: CanonicalTemplate | BuiltInTemplate): boolean {
  if ("isBuiltIn" in t) {
    const m = t.methodology.toLowerCase();
    return (
      t.complexity === "high" ||
      m.includes("waterfall") ||
      m.includes("itil") ||
      m.includes("roadmap")
    );
  }
  const gc = t.governanceConfiguration;
  const gateCount =
    gc?.phaseGates?.filter((g) => String(g).trim().length > 0).length ?? 0;
  const meth = (gc?.methodologyMapping || "").toLowerCase();
  return (
    t.complexity === "high" ||
    gateCount >= 2 ||
    meth.includes("waterfall") ||
    meth.includes("itil")
  );
}

function isFlexibleExecution(t: CanonicalTemplate | BuiltInTemplate): boolean {
  if ("isBuiltIn" in t) {
    const m = t.methodology.toLowerCase();
    return (
      t.complexity === "low" ||
      m.includes("kanban") ||
      m.includes("agile") ||
      m.includes("scrum") ||
      m.includes("lean")
    );
  }
  return t.complexity === "low" || t.structureType === "lightweight";
}

function filterBySidebar(
  rows: (CanonicalTemplate | BuiltInTemplate)[],
  key: CatalogSidebarKey,
): (CanonicalTemplate | BuiltInTemplate)[] {
  if (key === "recommended") {
    const heroes = rows.filter(isGovernedHero);
    return heroes.length > 0 ? heroes : rows;
  }
  if (key === "org") {
    return rows.filter((t) => !("isBuiltIn" in t) && Boolean(t.isCustom));
  }
  const cat = GENERAL_KEY_TO_CATEGORY[key];
  return rows.filter((t) => getTemplateCategory(t) === cat);
}

export function ProjectTemplateCenterModal({
  open,
  initialWorkspaceId,
  onClose,
  onSuccess,
}: ProjectTemplateCenterModalProps): ReactElement | null {
  const [step, setStep] = useState<Step>("catalog");
  const [apiTemplates, setApiTemplates] = useState<CanonicalTemplate[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeSidebar, setActiveSidebar] =
    useState<CatalogSidebarKey>("general_pm");
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterStrictGovernance, setFilterStrictGovernance] = useState(false);
  const [filterFlexibleExecution, setFilterFlexibleExecution] = useState(false);
  const [filterComplexityLow, setFilterComplexityLow] = useState(false);
  const [filterComplexityMedium, setFilterComplexityMedium] = useState(false);
  const [filterComplexityHigh, setFilterComplexityHigh] = useState(false);
  const [selected, setSelected] = useState<
    CanonicalTemplate | BuiltInTemplate | null
  >(null);
  const [workspaceId, setWorkspaceId] = useState(initialWorkspaceId || "");
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { createFromTemplate } = useTemplateCreation({
    onSuccess: (projectId, ws) => {
      onSuccess({ projectId, workspaceId: ws });
    },
  });

  useEffect(() => {
    if (!open) return;
    setStep("catalog");
    setSelected(null);
    setProjectName("");
    setWorkspaceId(initialWorkspaceId || "");
    setError(null);
    setActiveSidebar("general_pm");
    setQuery("");
    setFiltersOpen(false);
    setLoading(true);

    void Promise.all([listTemplates().catch(() => []), listWorkspaces()])
      .then(([templateRows, workspaceRows]) => {
        setApiTemplates(templateRows);
        setWorkspaces(workspaceRows);
        if (!initialWorkspaceId && workspaceRows[0]?.id) {
          setWorkspaceId(workspaceRows[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, initialWorkspaceId]);

  const allTemplates = useMemo(
    () => mergeTemplates(apiTemplates, BUILT_IN_TEMPLATES),
    [apiTemplates],
  );

  const catalogFiltered = useMemo(() => {
    let rows = filterBySidebar(allTemplates, activeSidebar);

    const kw = query.trim().toLowerCase();
    if (kw) {
      rows = rows.filter((t) =>
        `${t.name} ${t.description}`.toLowerCase().includes(kw),
      );
    }

    const govOn = filterStrictGovernance || filterFlexibleExecution;
    if (govOn) {
      rows = rows.filter((t) => {
        const s = isStrictGovernance(t);
        const f = isFlexibleExecution(t);
        if (filterStrictGovernance && filterFlexibleExecution) return s || f;
        if (filterStrictGovernance) return s;
        return f;
      });
    }

    const cxOn =
      filterComplexityLow || filterComplexityMedium || filterComplexityHigh;
    if (cxOn) {
      rows = rows.filter((t) => {
        const c = "isBuiltIn" in t ? t.complexity : t.complexity;
        return (
          (filterComplexityLow && c === "low") ||
          (filterComplexityMedium && c === "medium") ||
          (filterComplexityHigh && c === "high")
        );
      });
    }

    return rows;
  }, [
    allTemplates,
    activeSidebar,
    query,
    filterStrictGovernance,
    filterFlexibleExecution,
    filterComplexityLow,
    filterComplexityMedium,
    filterComplexityHigh,
  ]);

  function openImportFlow(t: CanonicalTemplate | BuiltInTemplate): void {
    setSelected(t);
    setProjectName("");
    setStep("import");
    setError(null);
    if (!("isBuiltIn" in t)) {
      void getTemplateDetail(t.id)
        .then((detail) => setSelected(detail))
        .catch(() => {});
    }
  }

  async function handleUseTemplate(): Promise<void> {
    if (!workspaceId) {
      setError("Choose a destination workspace");
      return;
    }
    if (!projectName.trim()) {
      setError("Project name is required");
      return;
    }
    if (!selected) {
      setError("Select a template");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createFromTemplate(selected as TemplateLike, {
        workspaceId,
        projectName: projectName.trim(),
        importOptions: DEFAULT_IMPORT,
      });
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Could not create project from template";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  const phases =
    selected && "isBuiltIn" in selected
      ? selected.phases
      : selected?.seedPhases || [];
  const statuses =
    selected && "isBuiltIn" in selected
      ? selected.statuses
      : selected?.includedStatuses || [];
  const views =
    selected && "isBuiltIn" in selected
      ? selected.views
      : selected?.includedViews || [];
  const taskCount =
    selected && "isBuiltIn" in selected
      ? selected.taskCount
      : selected?.seedTasks?.length || 0;

  if (!open) return null;

  /** Portal to document.body so `fixed` covers the full viewport above AppShell (flex layout). */
  const root =
    typeof document !== "undefined" ? document.body : null;
  if (!root) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={
          step === "catalog"
            ? "template-center-title"
            : "template-center-import-title"
        }
      >
        {step === "catalog" ? (
          <>
            <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-200 px-5 py-3 sm:gap-4 sm:px-6">
              <h2
                id="template-center-title"
                className="shrink-0 text-lg font-semibold tracking-tight text-slate-900"
              >
                Template center
              </h2>
              <div className="order-last flex w-full min-w-0 flex-1 justify-center sm:order-none sm:w-auto">
                <div className="relative w-full max-w-xl">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden
                  />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by template name or description"
                    autoComplete="off"
                    className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    aria-label="Search templates"
                  />
                </div>
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-1 sm:ml-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFiltersOpen((v) => !v);
                  }}
                  className={`rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 ${
                    filtersOpen ? "bg-slate-100 text-slate-800" : ""
                  }`}
                  aria-expanded={filtersOpen}
                  aria-label="Filter templates"
                  title="Filters"
                >
                  <Filter className="h-5 w-5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Close template center"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </header>

            {filtersOpen ? (
              <div className="shrink-0 border-b border-slate-100 bg-slate-50/80 px-6 py-3">
                <div className="flex flex-wrap gap-6">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Governance
                    </p>
                    <div className="flex flex-col gap-2">
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          checked={filterStrictGovernance}
                          onChange={(e) =>
                            setFilterStrictGovernance(e.target.checked)
                          }
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        Strict governance
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          checked={filterFlexibleExecution}
                          onChange={(e) =>
                            setFilterFlexibleExecution(e.target.checked)
                          }
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        Flexible execution
                      </label>
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Complexity
                    </p>
                    <div className="flex flex-col gap-2">
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          checked={filterComplexityLow}
                          onChange={(e) =>
                            setFilterComplexityLow(e.target.checked)
                          }
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        Low
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          checked={filterComplexityMedium}
                          onChange={(e) =>
                            setFilterComplexityMedium(e.target.checked)
                          }
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        Medium
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          checked={filterComplexityHigh}
                          onChange={(e) =>
                            setFilterComplexityHigh(e.target.checked)
                          }
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        High
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="mx-6 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="flex min-h-0 flex-1 overflow-hidden">
              <aside className="flex w-[250px] shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white py-4 pl-0 pr-2">
                <nav className="flex flex-col gap-0.5" aria-label="Template categories">
                  <button
                    type="button"
                    onClick={() => setActiveSidebar("recommended")}
                    className={`w-full rounded-r-lg border-l-4 py-2.5 pl-3 pr-2 text-left text-sm font-medium transition-colors ${
                      activeSidebar === "recommended"
                        ? "border-blue-600 bg-blue-50 text-blue-900"
                        : "border-transparent text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Recommended for you
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSidebar("org")}
                    className={`w-full rounded-r-lg border-l-4 py-2.5 pl-3 pr-2 text-left text-sm font-medium transition-colors ${
                      activeSidebar === "org"
                        ? "border-blue-600 bg-blue-50 text-blue-900"
                        : "border-transparent text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Created by my organization
                  </button>
                  <div
                    className="my-3 border-t border-slate-200"
                    role="separator"
                  />
                  <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    General templates
                  </p>
                  <ul className="flex flex-col gap-0.5">
                    {GENERAL_SIDEBAR.map((item) => {
                      const active = activeSidebar === item.id;
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => setActiveSidebar(item.id)}
                            className={`w-full rounded-r-lg border-l-4 py-2.5 pl-3 pr-2 text-left text-sm font-medium transition-colors ${
                              active
                                ? "border-blue-600 bg-blue-50 text-blue-900"
                                : "border-transparent text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {item.label}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
              </aside>

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
                <div className="shrink-0 border-b border-slate-100 px-6 py-3">
                  <p className="text-sm font-medium text-slate-700">
                    {SIDEBAR_BREADCRUMB[activeSidebar]}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {loading
                      ? "Loading…"
                      : `${catalogFiltered.length} template${catalogFiltered.length !== 1 ? "s" : ""}`}
                  </p>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-6">
                  {loading ? (
                    <div className="flex h-48 items-center justify-center text-sm text-slate-500">
                      Loading templates…
                    </div>
                  ) : catalogFiltered.length === 0 ? (
                    <div className="flex h-48 flex-col items-center justify-center text-sm text-slate-500">
                      <Layers className="mb-2 h-10 w-10 text-slate-300" />
                      <p>No templates match this view.</p>
                      <p className="mt-1 text-xs text-slate-400">
                        Try another category or adjust filters.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {catalogFiltered.map((t) => (
                        <TemplateCenterCard
                          key={t.id}
                          template={t}
                          showGovernedBadge={isGovernedHero(t)}
                          onUse={() => openImportFlow(t)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : null}

        {step === "import" && selected ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-3">
              <h2
                id="template-center-import-title"
                className="text-lg font-semibold text-slate-900"
              >
                Use Template
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close template center"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            {error ? (
              <div className="mx-6 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              <div className="px-6 py-4">
                <button
                  type="button"
                  onClick={() => {
                    setStep("catalog");
                    setError(null);
                  }}
                  className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-slate-700"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  Back to templates
                </button>

                <p className="mt-1 max-w-2xl text-sm text-slate-600">
                  <span className="font-medium text-slate-800">
                    {selected.name}
                  </span>
                  <span className="text-slate-500">
                    {" "}
                    — phases, tasks, views, and workflow defaults will be applied
                    when you create the project.
                  </span>
                </p>

                <div className="mt-6 space-y-4">
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-slate-700">
                      Project name
                    </span>
                    <input
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="Enter project name"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-slate-700">
                      Destination workspace
                    </span>
                    <select
                      value={workspaceId}
                      onChange={(e) => setWorkspaceId(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">Select workspace</option>
                      {workspaces.map((ws) => (
                        <option key={ws.id} value={ws.id}>
                          {ws.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Summary
                  </h4>
                  <ul className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600 sm:grid-cols-4">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                      {phases.length} phases
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                      {taskCount} tasks
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                      {views.length} views
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                      {statuses.length} statuses
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-auto border-t border-slate-200 bg-slate-50 px-6 py-4">
                <button
                  type="button"
                  onClick={() => void handleUseTemplate()}
                  disabled={submitting || !projectName.trim() || !workspaceId}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? "Creating…" : "Use Template"}
                  <Check className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>,
    root,
  );
}
