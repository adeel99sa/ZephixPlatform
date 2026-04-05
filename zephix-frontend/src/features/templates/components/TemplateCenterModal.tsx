/**
 * Template Center Modal — Monday-style template browser.
 * Left panel: categories. Right panel: template cards grid.
 * Opens as a modal overlay from workspace "+" → "New from template".
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Layers, Box, Code2, Settings2, Rocket, Search, LayoutGrid, Star, Building2, User, Plus } from "lucide-react";
import { createPortal } from "react-dom";
import { useWorkspaceStore } from "@/state/workspace.store";
import { useAuth } from "@/state/AuthContext";
import { isPlatformAdmin, isPlatformViewer } from "@/utils/access";
import { instantiateV51 } from "@/features/templates/api";
import { ProjectNameModal } from "./ProjectNameModal";

/* ── Category + built-in template definitions ── */

type Category = {
  id: string;
  label: string;
  icon: React.ElementType;
  templates: BuiltInTemplate[];
};

type BuiltInTemplate = {
  id: string;
  name: string;
  description: string;
  phases: string[];
  taskCount: number;
  /** If set, instantiate from this backend template ID. Otherwise use the built-in name. */
  backendTemplateId?: string;
};

const CATEGORIES: Category[] = [
  {
    id: "project-management",
    label: "Project Management",
    icon: Layers,
    templates: [
      {
        id: "pm-agile",
        name: "Agile Project Management",
        description:
          "Agile roadmap and sprint planning boards for iterative delivery.",
        phases: ["Backlog", "Sprint Planning", "In Progress", "Review", "Done"],
        taskCount: 12,
      },
      {
        id: "pm-basic",
        name: "Basic Project Plan",
        description:
          "Plan and manage any type of project from A to Z with phases and milestones.",
        phases: ["Initiation", "Planning", "Execution", "Monitoring", "Closure"],
        taskCount: 15,
      },
      {
        id: "pm-single",
        name: "Single Project Tracker",
        description:
          "Track one project flow in a workspace with tasks, owners, and due dates.",
        phases: ["To Do", "In Progress", "Review", "Complete"],
        taskCount: 8,
      },
      {
        id: "pm-risk-register",
        name: "Risk Register",
        description:
          "Identify, assess, and track risks across your projects with severity and mitigation plans.",
        phases: ["Identify", "Assess", "Mitigate", "Monitor"],
        taskCount: 10,
      },
    ],
  },
  {
    id: "product-management",
    label: "Product Management",
    icon: Box,
    templates: [
      {
        id: "prod-launch",
        name: "Product Launch",
        description:
          "End-to-end product launch plan from research through go-to-market.",
        phases: ["Research", "Build", "Beta", "Launch", "Post-Launch"],
        taskCount: 18,
      },
      {
        id: "prod-roadmap",
        name: "Product Roadmap",
        description:
          "Quarterly roadmap with themes, epics, and deliverables.",
        phases: ["Q1", "Q2", "Q3", "Q4"],
        taskCount: 16,
      },
      {
        id: "prod-feedback",
        name: "Feature Request Tracker",
        description:
          "Collect, prioritize, and track feature requests from customers and stakeholders.",
        phases: ["Inbox", "Under Review", "Planned", "In Progress", "Shipped"],
        taskCount: 10,
      },
    ],
  },
  {
    id: "software-development",
    label: "Software Development",
    icon: Code2,
    templates: [
      {
        id: "dev-sprint",
        name: "Sprint Planning",
        description:
          "Two-week sprint cycles with backlog grooming, daily standups, and retrospectives.",
        phases: ["Backlog", "Sprint", "In Review", "Done"],
        taskCount: 14,
      },
      {
        id: "dev-release",
        name: "Release Management",
        description:
          "Manage software releases from feature freeze through deployment and rollback plans.",
        phases: ["Feature Freeze", "QA", "Staging", "Production", "Rollback"],
        taskCount: 12,
      },
      {
        id: "dev-bug",
        name: "Bug Tracking",
        description:
          "Track bugs from report through triage, fix, and verification.",
        phases: ["Reported", "Triaged", "In Fix", "In QA", "Resolved"],
        taskCount: 8,
      },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    icon: Settings2,
    templates: [
      {
        id: "ops-migration",
        name: "System Migration",
        description:
          "Plan and execute system migrations with data mapping, testing, and cutover phases.",
        phases: ["Assessment", "Planning", "Data Migration", "Testing", "Cutover", "Post-Migration"],
        taskCount: 20,
      },
      {
        id: "ops-onboarding",
        name: "Employee Onboarding",
        description:
          "Structured onboarding program for new hires from day one through 90-day review.",
        phases: ["Pre-boarding", "Week 1", "Month 1", "Month 2", "Month 3"],
        taskCount: 15,
      },
      {
        id: "ops-process",
        name: "Process Improvement",
        description:
          "DMAIC-style continuous improvement framework for operational processes.",
        phases: ["Define", "Measure", "Analyze", "Improve", "Control"],
        taskCount: 12,
      },
    ],
  },
  {
    id: "startup",
    label: "Startup",
    icon: Rocket,
    templates: [
      {
        id: "startup-mvp",
        name: "MVP Development",
        description:
          "Build and ship your minimum viable product from idea validation to launch.",
        phases: ["Ideation", "Validation", "Build", "Test", "Launch"],
        taskCount: 14,
      },
      {
        id: "startup-fundraising",
        name: "Fundraising Tracker",
        description:
          "Manage your fundraising pipeline from lead to close with investor tracking.",
        phases: ["Research", "Outreach", "Pitch", "Due Diligence", "Close"],
        taskCount: 10,
      },
      {
        id: "startup-gtm",
        name: "Go-to-Market Strategy",
        description:
          "Plan your go-to-market from positioning through launch campaigns and metrics.",
        phases: ["Positioning", "Channels", "Content", "Launch", "Measure"],
        taskCount: 12,
      },
    ],
  },
];

/* ── Modal Component ── */

interface TemplateCenterModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
}

// Top-level views (above category list)
type TopView = "all" | "recommended" | "by-zephix" | "created-by-me";

const TOP_VIEWS: { id: TopView; label: string; icon: React.ElementType }[] = [
  { id: "all", label: "All templates", icon: LayoutGrid },
  { id: "recommended", label: "Recommended for you", icon: Star },
  { id: "by-zephix", label: "Created by Zephix", icon: Building2 },
  { id: "created-by-me", label: "Created by me", icon: User },
];

export function TemplateCenterModal({ open, onClose, workspaceId }: TemplateCenterModalProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = isPlatformAdmin(user);
  const canCreateTemplate = !!user && !isPlatformViewer(user); // Admin or workspace owner (Member+)
  const { activeWorkspaceId } = useWorkspaceStore();
  const [activeView, setActiveView] = useState<TopView | null>(null);
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
  const [search, setSearch] = useState("");
  const [pendingTemplate, setPendingTemplate] = useState<BuiltInTemplate | null>(null);
  const [instantiating, setInstantiating] = useState(false);
  const [instantiateError, setInstantiateError] = useState<{ code: string; message: string } | null>(null);

  if (!open) return null;

  // All templates across all categories (for top-level views)
  const allTemplates = CATEGORIES.flatMap((c) =>
    c.templates.map((t) => ({ ...t, categoryLabel: c.label })),
  );

  // Determine which templates to show based on active view or category
  let displayLabel = "";
  let displayTemplates: (BuiltInTemplate & { categoryLabel?: string })[] = [];

  if (activeView === "all") {
    displayLabel = "All templates";
    displayTemplates = allTemplates;
  } else if (activeView === "recommended") {
    displayLabel = "Recommended for you";
    // Show first 2 from each category as recommendations
    displayTemplates = CATEGORIES.flatMap((c) =>
      c.templates.slice(0, 2).map((t) => ({ ...t, categoryLabel: c.label })),
    );
  } else if (activeView === "by-zephix") {
    displayLabel = "Created by Zephix";
    // All built-in templates are by Zephix
    displayTemplates = allTemplates;
  } else if (activeView === "created-by-me") {
    displayLabel = "Created by me";
    // TODO: fetch user-created templates from backend
    displayTemplates = [];
  } else {
    // Category view
    const category = CATEGORIES.find((c) => c.id === activeCategory) ?? CATEGORIES[0];
    displayLabel = category.label;
    displayTemplates = category.templates;
  }

  // Apply search filter
  const filteredTemplates = search.trim()
    ? displayTemplates.filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.description.toLowerCase().includes(search.toLowerCase()),
      )
    : displayTemplates;

  const handleUseTemplate = (template: BuiltInTemplate) => {
    setPendingTemplate(template);
  };

  const handleInstantiate = async (projectName: string) => {
    if (!pendingTemplate) return;
    const wsId = workspaceId || activeWorkspaceId;
    if (!wsId) return;

    setInstantiating(true);
    setInstantiateError(null);

    try {
      if (pendingTemplate.backendTemplateId) {
        const result = await instantiateV51(pendingTemplate.backendTemplateId, projectName);
        setPendingTemplate(null);
        onClose();
        navigate(`/projects/${result.projectId}`, { replace: true });
      } else {
        // No backend template — create blank project with template name as basis
        const { apiClient } = await import("@/lib/api/client");
        const res = await apiClient.post<{ data: { id: string } }>(
          "/projects",
          { name: projectName, workspaceId: wsId },
          { headers: { "x-workspace-id": wsId } },
        );
        const projectId = res.data?.data?.id ?? (res.data as any)?.id;
        setPendingTemplate(null);
        onClose();
        if (projectId) navigate(`/projects/${projectId}`, { replace: true });
      }
    } catch (err: any) {
      setInstantiateError({
        code: err?.response?.data?.code || "ERROR",
        message: err?.response?.data?.message || err?.message || "Failed to create project",
      });
    } finally {
      setInstantiating(false);
    }
  };

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[5000] bg-black/50" onClick={onClose} />

      {/* Modal — centered, adapts to viewport, capped at comfortable max size */}
      <div
        className="fixed inset-0 z-[5001] m-auto flex flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        style={{
          width: "min(96vw, 1280px)",
          height: "min(92vh, 900px)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <Layers className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">Template center</h2>
          </div>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by template name or description"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-72 rounded-lg border border-slate-200 py-1.5 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar */}
          <aside className="w-56 shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50/50 py-4">
            {/* Top-level views */}
            <nav className="space-y-0.5 px-2 pb-3">
              {TOP_VIEWS.map((view) => {
                const Icon = view.icon;
                const isActive = activeView === view.id;
                return (
                  <button
                    key={view.id}
                    type="button"
                    onClick={() => {
                      setActiveView(view.id);
                      setSearch("");
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition ${
                      isActive
                        ? "bg-blue-50 font-medium text-blue-700"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                    {view.label}
                  </button>
                );
              })}
            </nav>

            <div className="mx-4 mb-3 border-t border-slate-200" />

            {/* Category list */}
            <div className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              General templates
            </div>
            <nav className="space-y-0.5 px-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeView === null && cat.id === activeCategory;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setActiveView(null);
                      setActiveCategory(cat.id);
                      setSearch("");
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition ${
                      isActive
                        ? "bg-blue-50 font-medium text-blue-700"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                    {cat.label}
                  </button>
                );
              })}
            </nav>

            {/* Admin: Create template */}
            {canCreateTemplate && (
              <>
                <div className="mx-4 my-3 border-t border-slate-200" />
                <div className="px-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate("/administration/templates");
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-blue-600 transition hover:bg-blue-50"
                  >
                    <Plus className="h-4 w-4 shrink-0" />
                    Create template
                  </button>
                </div>
              </>
            )}
          </aside>

          {/* Right panel — template cards */}
          <main className="flex-1 overflow-y-auto p-6">
            <div className="mb-5">
              <h3 className="text-base font-semibold text-slate-900">
                {activeView ? displayLabel : `General templates | ${displayLabel}`}
              </h3>
              <p className="mt-0.5 text-sm text-slate-500">
                {filteredTemplates.length} template{filteredTemplates.length !== 1 ? "s" : ""} available
              </p>
            </div>

            {filteredTemplates.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-12 text-center">
                <p className="text-sm text-slate-500">
                  {activeView === "created-by-me"
                    ? "You haven\u2019t created any templates yet."
                    : "No templates match your search."}
                </p>
                {activeView === "created-by-me" && canCreateTemplate && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate("/administration/templates");
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    Create your first template
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredTemplates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="group flex flex-col rounded-xl border border-slate-200 bg-white transition hover:border-blue-200 hover:shadow-md"
                  >
                    {/* Card thumbnail placeholder */}
                    <div className="flex h-36 items-center justify-center rounded-t-xl bg-gradient-to-br from-slate-50 to-slate-100">
                      <div className="grid grid-cols-2 gap-1.5">
                        {tpl.phases.slice(0, 4).map((p, i) => (
                          <div
                            key={i}
                            className="rounded bg-white/80 px-2 py-1 text-[10px] font-medium text-slate-500 shadow-sm"
                          >
                            {p}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Card body */}
                    <div className="flex flex-1 flex-col p-4">
                      <h4 className="text-sm font-semibold text-slate-900">{tpl.name}</h4>
                      <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-500">
                        {tpl.description}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">
                          {tpl.phases.length} phases · {tpl.taskCount} tasks
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUseTemplate(tpl)}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100 hover:bg-blue-700"
                        >
                          Use template
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Project Name Modal */}
      <ProjectNameModal
        open={!!pendingTemplate}
        loading={instantiating}
        error={instantiateError}
        onClose={() => {
          setPendingTemplate(null);
          setInstantiateError(null);
        }}
        onSubmit={handleInstantiate}
      />
    </>,
    document.body,
  );
}
