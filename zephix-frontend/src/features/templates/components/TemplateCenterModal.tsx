/**
 * Template Center Modal — Phase 1 (real backend data only)
 *
 * Hard rules enforced:
 *  HR1: No blank-project fallback. Only POST /templates/:id/instantiate-v5_1.
 *  HR2: v1 templates only (uses listTemplates from templates.api.ts).
 *  HR4: Menu label is the canonical NEW_TEMPLATE_ACTION_LABEL constant
 *       from `features/templates/labels.ts` (set in SidebarWorkspaces).
 *  HR5: "Created by me" hidden until backed by real data.
 *  HR6: Every card is a real backend template — no hardcoded placeholders.
 */
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { X, Search, LayoutGrid, Building2, Layers, Loader2, AlertCircle, User, Users as UsersIcon } from "lucide-react";
import { toast } from "sonner";

import { useWorkspaceStore } from "@/state/workspace.store";
import { useAuth } from "@/state/AuthContext";
import { listTemplates, type TemplateDto } from "@/features/templates/templates.api";
import { getPreview, instantiateV51, type PreviewResponse } from "@/features/templates/api";
import { TemplatePreviewModal } from "./TemplatePreviewModal";
import { ProjectNameModal } from "./ProjectNameModal";
import { TemplateBlueprint } from "./TemplateBlueprint";
import {
  PROJECT_TEMPLATE_CATEGORIES,
  type ProjectTemplateCategory,
} from "@/features/templates/categories";

interface TemplateCenterModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
}

type TopView = "all" | "by-zephix" | "workspace" | "mine";

/**
 * Phase 5A — secondary "source" filters. The primary IA is category-first;
 * source filters are a small section under categories. They render only
 * when they would be useful (i.e. when at least one template matches).
 */
const SOURCE_VIEWS: { id: TopView; label: string; icon: React.ElementType }[] = [
  { id: "all", label: "All templates", icon: LayoutGrid },
  { id: "by-zephix", label: "Created by Zephix", icon: Building2 },
  { id: "workspace", label: "Workspace templates", icon: UsersIcon },
  { id: "mine", label: "Created by me", icon: User },
];

/**
 * Phase 5A — group templates by their REAL `category` field only.
 * No methodology fallback. Templates with no category land in "Other".
 * Categories are rendered in the locked PROJECT_TEMPLATE_CATEGORIES order.
 */
function groupByCategory(templates: TemplateDto[]): Map<string, TemplateDto[]> {
  const groups = new Map<string, TemplateDto[]>();
  for (const tpl of templates) {
    const key = tpl.category?.trim() || "Other";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(tpl);
  }
  return groups;
}

/** Phase 5A — derive complexity from real backend phase + task counts. */
function deriveComplexity(tpl: TemplateDto): 'Light' | 'Standard' | 'Advanced' {
  const phases = Array.isArray(tpl.phases) ? tpl.phases.length : 0;
  const tasks =
    (tpl.taskTemplates?.length ?? tpl.task_templates?.length ?? 0) as number;
  if (phases <= 2 && tasks <= 6) return 'Light';
  if (phases <= 4 && tasks <= 14) return 'Standard';
  return 'Advanced';
}

/** Phase 5A — read purpose from typed metadata, fall back to description. */
function templatePurpose(tpl: TemplateDto): string {
  const meta = tpl.metadata as Record<string, unknown> | null | undefined;
  const purpose = meta && typeof meta.purpose === 'string' ? meta.purpose : '';
  if (purpose.trim()) return purpose.trim();
  // Fallback: first sentence of the description
  const desc = (tpl.description ?? '').trim();
  if (!desc) return '';
  const firstSentence = desc.split(/(?<=\.)\s/)[0] ?? desc;
  return firstSentence;
}

function methodologyLabel(m?: string): string {
  if (!m) return "";
  switch (m) {
    case "agile":
    case "scrum":
      return "Agile / Scrum";
    case "kanban":
      return "Kanban";
    case "waterfall":
      return "Waterfall";
    case "hybrid":
      return "Hybrid";
    default:
      return m;
  }
}

function scopeLabel(scope: string): string {
  switch (scope) {
    case "SYSTEM":
      return "Zephix";
    case "ORG":
      return "Organization";
    case "WORKSPACE":
      return "Workspace";
    default:
      return scope;
  }
}

/**
 * Phase 4 (Template Center): per-card source label.
 * - SYSTEM templates → "Zephix"
 * - WORKSPACE templates created by current user → "Mine"
 * - WORKSPACE templates by others → "Workspace"
 * - ORG → "Organization"
 */
function sourceLabel(tpl: TemplateDto, currentUserId: string | null): string {
  if (tpl.templateScope === "SYSTEM") return "Zephix";
  if (tpl.templateScope === "ORG") return "Organization";
  if (tpl.templateScope === "WORKSPACE") {
    if (currentUserId && tpl.createdById === currentUserId) return "Mine";
    return "Workspace";
  }
  return tpl.templateScope;
}

export function TemplateCenterModal({ open, onClose, workspaceId }: TemplateCenterModalProps) {
  const navigate = useNavigate();
  const { activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  const { user } = useAuth();
  const currentUserId = (user as any)?.id ?? null;

  const [templates, setTemplates] = useState<TemplateDto[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeView, setActiveView] = useState<TopView | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [previewTemplate, setPreviewTemplate] = useState<TemplateDto | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<{ code: string; message: string } | null>(null);
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);

  const [pendingTemplate, setPendingTemplate] = useState<TemplateDto | null>(null);
  const [instantiating, setInstantiating] = useState(false);
  const [instantiateError, setInstantiateError] = useState<{ code: string; message: string } | null>(null);

  // Ensure active workspace is set so templates.api can include x-workspace-id
  useEffect(() => {
    if (open && workspaceId && activeWorkspaceId !== workspaceId) {
      setActiveWorkspace(workspaceId);
    }
  }, [open, workspaceId, activeWorkspaceId, setActiveWorkspace]);

  // Phase 4.6: extracted so we can also call it from the
  // 'zephix:templates:invalidate' event listener below.
  const fetchTemplatesRef = React.useRef<() => void>(() => {});
  useEffect(() => {
    fetchTemplatesRef.current = () => {
      let cancelled = false;
      setLoadingTemplates(true);
      setLoadError(null);
      listTemplates()
        .then((rows) => {
          if (cancelled) return;
          const active = (rows || []).filter((t) => t.isActive);
          setTemplates(active);
          if (active.length > 0 && !activeCategory) {
            const firstCategory =
              active[0].category?.trim() ||
              methodologyLabel(active[0].methodology) ||
              "Other";
            setActiveCategory(firstCategory);
          }
        })
        .catch((err) => {
          if (cancelled) return;
          setLoadError(err?.message || "Failed to load templates");
          setTemplates([]);
        })
        .finally(() => {
          if (!cancelled) setLoadingTemplates(false);
        });
      return () => {
        cancelled = true;
      };
    };
  }, [activeCategory]);

  // Fetch templates when modal opens
  useEffect(() => {
    if (!open) return;
    fetchTemplatesRef.current();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Phase 4.6: refresh on the global "templates invalidate" event so the
  // Template Center reflects a Save-as-template that just succeeded —
  // without forcing the user to fully close and reopen the modal.
  useEffect(() => {
    if (!open) return;
    const handler = () => fetchTemplatesRef.current();
    window.addEventListener("zephix:templates:invalidate", handler);
    return () =>
      window.removeEventListener("zephix:templates:invalidate", handler);
  }, [open]);

  // Phase 5A — group by real category only. Order the rail by the locked
  // PROJECT_TEMPLATE_CATEGORIES list, plus a trailing "Other" bucket for
  // anything uncategorized so nothing is hidden silently.
  const groups = useMemo(() => groupByCategory(templates), [templates]);
  const categories = useMemo(() => {
    const ordered: string[] = [];
    for (const cat of PROJECT_TEMPLATE_CATEGORIES) {
      if ((groups.get(cat)?.length ?? 0) > 0) ordered.push(cat);
    }
    if ((groups.get('Other')?.length ?? 0) > 0) ordered.push('Other');
    return ordered;
  }, [groups]);

  // Phase 5A: source filters render only when their result set is non-empty.
  // No empty section is shown.
  const sourceViewsCounts: Record<TopView, number> = {
    all: templates.length,
    'by-zephix': templates.filter((t) => t.templateScope === 'SYSTEM').length,
    workspace: templates.filter((t) => t.templateScope === 'WORKSPACE').length,
    mine: currentUserId
      ? templates.filter(
          (t) => t.templateScope === 'WORKSPACE' && t.createdById === currentUserId,
        ).length
      : 0,
  };
  const visibleSourceViews = SOURCE_VIEWS.filter(
    (v) => sourceViewsCounts[v.id] > 0,
  );

  // Determine display set based on active source view or active category
  let displayLabel = "";
  let displayTemplates: TemplateDto[] = [];

  if (activeView === "all") {
    displayLabel = "All templates";
    displayTemplates = templates;
  } else if (activeView === "by-zephix") {
    displayLabel = "Created by Zephix";
    displayTemplates = templates.filter((t) => t.templateScope === "SYSTEM");
  } else if (activeView === "workspace") {
    displayLabel = "Workspace templates";
    displayTemplates = templates.filter((t) => t.templateScope === "WORKSPACE");
  } else if (activeView === "mine") {
    displayLabel = "Created by me";
    displayTemplates = currentUserId
      ? templates.filter(
          (t) => t.templateScope === "WORKSPACE" && t.createdById === currentUserId,
        )
      : [];
  } else if (activeCategory) {
    displayLabel = activeCategory;
    displayTemplates = groups.get(activeCategory) || [];
  } else if (categories.length > 0) {
    // Phase 5A: default landing is the first non-empty category, not "All".
    // Category-first IA — users land directly inside a category bucket.
    const first = categories[0];
    displayLabel = first;
    displayTemplates = groups.get(first) || [];
  } else {
    // No categorized templates yet (zero seeded) — show All as a single bucket
    displayLabel = "All templates";
    displayTemplates = templates;
  }

  // Phase 5A: auto-pick a default category once data loads, so the empty
  // "no category active" state never sticks.
  useEffect(() => {
    if (
      !loadingTemplates &&
      activeView === null &&
      activeCategory === null &&
      categories.length > 0
    ) {
      setActiveCategory(categories[0]);
    }
  }, [loadingTemplates, activeView, activeCategory, categories]);

  // Apply search filter
  const filteredTemplates = search.trim()
    ? displayTemplates.filter((t) => {
        const q = search.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          (t.description || "").toLowerCase().includes(q)
        );
      })
    : displayTemplates;

  // Open preview for selected template
  const handlePreview = async (tpl: TemplateDto) => {
    setPreviewTemplate(tpl);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewData(null);
    try {
      const data = await getPreview(tpl.id);
      setPreviewData(data);
    } catch (err: any) {
      setPreviewError({
        code: err?.response?.data?.code || "PREVIEW_FAILED",
        message: err?.response?.data?.message || err?.message || "Failed to load template preview",
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    setPreviewTemplate(null);
    setPreviewData(null);
    setPreviewError(null);
    setPreviewLoading(false);
  };

  // Open project name modal — only when we have a real template id
  const handleUseTemplate = (tpl: TemplateDto) => {
    if (!tpl.id) {
      toast.error("This template cannot be used yet");
      return;
    }
    // Phase 5B.1 — Coming-soon templates cannot be instantiated from the UI.
    // Backend routes remain enabled so the policy is reversible per template
    // without a redeploy.
    if (tpl.comingSoon) {
      toast.info(`${tpl.name} is coming soon`);
      return;
    }
    setPendingTemplate(tpl);
  };

  // Instantiate via canonical endpoint only — NO blank-project fallback (HR1)
  const handleInstantiate = async (projectName: string) => {
    if (!pendingTemplate?.id) {
      setInstantiateError({
        code: "INVALID_TEMPLATE",
        message: "This template cannot be applied. Please choose another template.",
      });
      return;
    }
    const wsId = workspaceId || activeWorkspaceId;
    if (!wsId) {
      setInstantiateError({
        code: "WORKSPACE_REQUIRED",
        message: "A workspace is required to create a project",
      });
      return;
    }

    setInstantiating(true);
    setInstantiateError(null);

    try {
      const result = await instantiateV51(pendingTemplate.id, projectName);
      setPendingTemplate(null);
      handleClosePreview();
      onClose();
      toast.success(`Project "${result.projectName}" created`);
      // Phase 5B.1A defect fix: notify the rest of the app that a project
      // was created in this workspace. SidebarWorkspaces and the workspace
      // dashboard listen for this event and refetch their project list.
      // Without this, the operator's "sidebar/dashboard out of sync after
      // create" symptom appears: the new project exists in the DB but the
      // sidebar tree and dashboard counts only update on full page reload.
      const wsId = workspaceId || activeWorkspaceId;
      if (wsId) {
        window.dispatchEvent(
          new CustomEvent('zephix:projects:invalidate', {
            detail: { workspaceId: wsId, projectId: result.projectId },
          }),
        );
      }
      // Phase 5B.1A defect fix: Waterfall projects must land directly on the
      // Tasks tab (the row-and-column work surface), not on Overview. If we
      // navigate to the bare project URL, ProjectPageLayout's after-load
      // redirect kicks in but the user briefly sees the generic Overview
      // shell first — exactly the symptom from the operator screenshots.
      // Navigating straight to /tasks here removes that flash and the
      // "Project not found" race that looked like a 404 on the first attempt.
      const isWaterfall =
        (pendingTemplate.methodology || '').toLowerCase() === 'waterfall';
      navigate(
        isWaterfall
          ? `/projects/${result.projectId}/tasks`
          : `/projects/${result.projectId}`,
        { replace: true },
      );
    } catch (err: any) {
      setInstantiateError({
        code: err?.response?.data?.code || "INSTANTIATE_FAILED",
        message: err?.response?.data?.message || err?.message || "Failed to create project from template",
      });
    } finally {
      setInstantiating(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[5000] bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div
        className="fixed inset-0 z-[5001] m-auto flex flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        style={{ width: "min(96vw, 1280px)", height: "min(92vh, 900px)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <Layers className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">Template center</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search templates"
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
          {/* Left sidebar — Phase 5A: category-first IA, sources secondary */}
          <aside
            className="w-56 shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50/50 py-4"
            data-testid="template-center-rail"
          >
            {/* PRIMARY: Categories (locked order, only non-empty buckets) */}
            <div className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Categories
            </div>
            <nav className="space-y-0.5 px-2 pb-3" data-testid="template-center-categories">
              {categories.length === 0 && (
                <div className="px-3 py-2 text-xs text-slate-400">
                  No categories yet
                </div>
              )}
              {categories.map((cat) => {
                const count = groups.get(cat)?.length ?? 0;
                const isActive = activeView === null && cat === activeCategory;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setActiveView(null);
                      setActiveCategory(cat);
                      setSearch("");
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition ${
                      isActive ? "bg-blue-50 font-medium text-blue-700" : "text-slate-700 hover:bg-slate-100"
                    }`}
                    data-testid={`template-center-category-${cat}`}
                  >
                    <Layers className={`h-4 w-4 shrink-0 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                    <span className="min-w-0 flex-1 truncate">{cat}</span>
                    <span className="text-[10px] font-semibold text-slate-400">{count}</span>
                  </button>
                );
              })}
            </nav>

            {/* SECONDARY: source filters — only render non-empty ones */}
            {visibleSourceViews.length > 0 && (
              <>
                <div className="mx-4 mb-3 border-t border-slate-200" />
                <div className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Sources
                </div>
                <nav className="space-y-0.5 px-2" data-testid="template-center-sources">
                  {visibleSourceViews.map((view) => {
                    const Icon = view.icon;
                    const isActive = activeView === view.id;
                    return (
                      <button
                        key={view.id}
                        type="button"
                        onClick={() => {
                          setActiveView(view.id);
                          setActiveCategory(null);
                          setSearch("");
                        }}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition ${
                          isActive ? "bg-blue-50 font-medium text-blue-700" : "text-slate-700 hover:bg-slate-100"
                        }`}
                        data-testid={`template-center-source-${view.id}`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                        <span className="min-w-0 flex-1 truncate">{view.label}</span>
                        <span className="text-[10px] font-semibold text-slate-400">
                          {sourceViewsCounts[view.id]}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </>
            )}
          </aside>

          {/* Right panel — template cards */}
          <main className="flex-1 overflow-y-auto p-6">
            {loadingTemplates ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : loadError ? (
              <div className="flex h-full items-center justify-center">
                <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
                  <AlertCircle className="mx-auto h-6 w-6 text-red-500" />
                  <p className="mt-2 text-sm font-medium text-red-700">Could not load templates</p>
                  <p className="mt-1 text-xs text-red-600">{loadError}</p>
                </div>
              </div>
            ) : templates.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <Layers className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-sm font-medium text-slate-700">No templates available</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Templates appear here when added by your organization or platform.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-5">
                  <h3 className="text-base font-semibold text-slate-900">
                    {displayLabel || "All templates"}
                  </h3>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {filteredTemplates.length} template{filteredTemplates.length !== 1 ? "s" : ""}
                  </p>
                </div>

                {filteredTemplates.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 p-12 text-center">
                    <p className="text-sm text-slate-500">No templates match your search.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredTemplates.map((tpl) => (
                      <TemplateCard
                        key={tpl.id}
                        template={tpl}
                        currentUserId={currentUserId}
                        onPreview={() => handlePreview(tpl)}
                        onUse={() => handleUseTemplate(tpl)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Preview modal */}
      {previewTemplate && (
        <TemplatePreviewModal
          open
          loading={previewLoading}
          error={previewError}
          data={previewData}
          template={previewTemplate}
          onClose={handleClosePreview}
          onUseTemplate={() => {
            if (previewTemplate) {
              handleClosePreview();
              handleUseTemplate(previewTemplate);
            }
          }}
        />
      )}

      {/* Project name modal */}
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

/* ── Phase 5A — Template card frame ──
 *
 * Required anatomy (Phase 5A UX rules):
 *   1. template name
 *   2. one-line purpose
 *   3. methodology badge
 *   4. complexity badge (Light / Standard / Advanced — derived from real
 *      backend phase + task counts)
 *   5. included structure summary (phase count + task count)
 *   6. Zephix-native blueprint preview thumbnail (no external screenshots)
 *
 * Source label is rendered as a small subordinate chip — kept truthful
 * but explicitly de-emphasized so the primary IA stays category-first.
 */
function TemplateCard({
  template,
  currentUserId,
  onPreview,
  onUse,
}: {
  template: TemplateDto;
  currentUserId: string | null;
  onPreview: () => void;
  onUse: () => void;
}) {
  const flatPhases = template.phases || [];
  const flatTasks = template.task_templates || template.taskTemplates || [];
  const phaseCount = flatPhases.length;
  const taskCount = flatTasks.length;
  const purpose = templatePurpose(template);
  const complexity = deriveComplexity(template);
  const complexityChip =
    complexity === 'Light'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
      : complexity === 'Standard'
        ? 'bg-blue-50 text-blue-700 border-blue-100'
        : 'bg-violet-50 text-violet-700 border-violet-100';

  // Phase 5B.1 — Coming-soon templates render greyed out and disable
  // the "Use template" CTA. Preview is still allowed (read-only summary).
  const isComingSoon = template.comingSoon === true;

  return (
    <div
      className={`group flex flex-col rounded-xl border bg-white transition ${
        isComingSoon
          ? "border-slate-200 opacity-70"
          : "border-slate-200 hover:border-blue-200 hover:shadow-md"
      }`}
      data-testid={`template-card-${template.id}`}
      data-coming-soon={isComingSoon ? "true" : "false"}
    >
      {/* Blueprint thumbnail — Zephix-native, no external imagery */}
      <button
        type="button"
        onClick={onPreview}
        className="block h-28 w-full rounded-t-xl border-b border-slate-200 bg-slate-50 text-left"
        aria-label={`Preview ${template.name}`}
      >
        <TemplateBlueprint template={template} size="card" />
      </button>

      <div className="flex flex-1 flex-col p-4">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-semibold text-slate-900">{template.name}</h4>
          {isComingSoon ? (
            <span
              className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700"
              data-testid="template-coming-soon-badge"
            >
              Coming soon
            </span>
          ) : (
            <span
              className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500"
              data-testid="template-source-label"
            >
              {sourceLabel(template, currentUserId)}
            </span>
          )}
        </div>

        {/* Purpose */}
        {purpose && (
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-600">
            {purpose}
          </p>
        )}

        {/* Badges row: methodology + complexity */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {template.methodology && (
            <span
              className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700"
              data-testid="template-card-methodology-badge"
            >
              {methodologyLabel(template.methodology)}
            </span>
          )}
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${complexityChip}`}
            data-testid="template-card-complexity-badge"
          >
            {complexity}
          </span>
        </div>

        {/* Structure summary + actions */}
        <div className="mt-3 flex items-center justify-between">
          <span
            className="text-[11px] text-slate-400"
            data-testid="template-card-structure-summary"
          >
            {phaseCount > 0 ? `${phaseCount} phase${phaseCount !== 1 ? "s" : ""}` : "0 phases"}
            {" · "}
            {taskCount > 0 ? `${taskCount} task${taskCount !== 1 ? "s" : ""}` : "0 tasks"}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onPreview}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Preview
            </button>
            <button
              type="button"
              onClick={onUse}
              disabled={isComingSoon}
              aria-disabled={isComingSoon}
              title={isComingSoon ? "Coming soon" : undefined}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                isComingSoon
                  ? "cursor-not-allowed bg-slate-100 text-slate-400"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
              data-testid={`template-use-${template.id}`}
            >
              {isComingSoon ? "Coming soon" : "Use template"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
