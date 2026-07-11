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
import { X, Search, LayoutGrid, Building2, Layers, Loader2, AlertCircle, User, Users as UsersIcon, Star } from "lucide-react";
import { toast } from "sonner";

import { useWorkspaceStore } from "@/state/workspace.store";
import { useAuth } from "@/state/AuthContext";
import { listTemplates, setTemplatePreferred, type TemplateDto } from "@/features/templates/templates.api";
import { getPreview, type PreviewResponse } from "@/features/templates/api";
import {
  isOrgPreferredTemplate,
  matchesKindFilter,
  resolveCatalogTier,
  resolvePostInstantiateProjectPath,
  resolveSetupBadge,
  type TemplateKindFilter,
} from "@/features/templates/template.mapper";
import { isPlatformAdmin } from "@/utils/access";
import { TemplatePreviewModal } from "./TemplatePreviewModal";
import { UseTemplateFlowModal } from "./UseTemplateFlowModal";
import { AttachDocumentModal } from "./AttachDocumentModal";
import { TemplateBlueprint } from "./TemplateBlueprint";
import {
  CATALOG_TIER_CATEGORIES,
} from "@/features/templates/categories";

interface TemplateCenterModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  /** TC-F1: render as full-page browse (no portal/backdrop) for /templates route. */
  embedded?: boolean;
  /** TC-F3: open on a catalog tier (e.g. "Your templates"). */
  initialCategory?: string | null;
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
 * TC-F2 — group project templates by catalog tier (Starters / Methodology / Domain).
 * Document/form kinds keep a flat list under their type filter.
 */
function groupByTier(templates: TemplateDto[]): Map<string, TemplateDto[]> {
  const groups = new Map<string, TemplateDto[]>();
  for (const tpl of templates) {
    const key = resolveCatalogTier(tpl);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(tpl);
  }
  return groups;
}

/** Setup badge: metadata.setup first, then count-derived. */
function deriveComplexity(tpl: TemplateDto): 'Simple' | 'Standard' | 'Rich' | 'Advanced' {
  return resolveSetupBadge(tpl);
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

export function TemplateCenterModal({
  open,
  onClose,
  workspaceId,
  embedded = false,
  initialCategory = null,
}: TemplateCenterModalProps) {
  const navigate = useNavigate();
  const { activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  const { user } = useAuth();
  const currentUserId = (user as any)?.id ?? null;
  const isAdmin = isPlatformAdmin(user);

  const [templates, setTemplates] = useState<TemplateDto[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeView, setActiveView] = useState<TopView | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(initialCategory);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<TemplateKindFilter>("projects");

  const [previewTemplate, setPreviewTemplate] = useState<TemplateDto | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<{ code: string; message: string } | null>(null);
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);

  const [pendingTemplate, setPendingTemplate] = useState<TemplateDto | null>(null);
  const [attachTemplate, setAttachTemplate] = useState<TemplateDto | null>(null);
  const [instantiateError, setInstantiateError] = useState<{ code: string; message: string } | null>(null);
  const [preferredBusyId, setPreferredBusyId] = useState<string | null>(null);

  useEffect(() => {
    if ((!open && !embedded) || !workspaceId) return;
    if (workspaceId && activeWorkspaceId !== workspaceId) {
      setActiveWorkspace(workspaceId);
    }
  }, [open, embedded, workspaceId, activeWorkspaceId, setActiveWorkspace]);

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
            const preferred =
              initialCategory &&
              CATALOG_TIER_CATEGORIES.includes(initialCategory as (typeof CATALOG_TIER_CATEGORIES)[number])
                ? initialCategory
                : resolveCatalogTier(active[0]);
            setActiveCategory(preferred);
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
  }, [activeCategory, initialCategory]);

  useEffect(() => {
    if (!open && !embedded) return;
    fetchTemplatesRef.current();
  }, [open, embedded]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open && !embedded) return;
    const handler = () => fetchTemplatesRef.current();
    window.addEventListener("zephix:templates:invalidate", handler);
    return () =>
      window.removeEventListener("zephix:templates:invalidate", handler);
  }, [open, embedded]);

  // TC-F2 — group by catalog tier for project browse.
  const kindFilteredTemplates = useMemo(
    () => templates.filter((t) => matchesKindFilter(t, kindFilter)),
    [templates, kindFilter],
  );
  const preferredOrgTemplates = useMemo(
    () => kindFilteredTemplates.filter(isOrgPreferredTemplate),
    [kindFilteredTemplates],
  );
  const categories = useMemo(() => {
    const ordered: string[] = [];
    const scoped = groupByTier(kindFilteredTemplates);
    for (const cat of CATALOG_TIER_CATEGORIES) {
      if ((scoped.get(cat)?.length ?? 0) > 0) ordered.push(cat);
    }
    return ordered;
  }, [kindFilteredTemplates]);

  const kindScopedGroups = useMemo(() => groupByTier(kindFilteredTemplates), [kindFilteredTemplates]);

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
    displayTemplates = kindFilteredTemplates;
  } else if (activeView === "by-zephix") {
    displayLabel = "Created by Zephix";
    displayTemplates = kindFilteredTemplates.filter((t) => t.templateScope === "SYSTEM");
  } else if (activeView === "workspace") {
    displayLabel = "Workspace templates";
    displayTemplates = kindFilteredTemplates.filter((t) => t.templateScope === "WORKSPACE");
  } else if (activeView === "mine") {
    displayLabel = "Created by me";
    displayTemplates = currentUserId
      ? kindFilteredTemplates.filter(
          (t) => t.templateScope === "WORKSPACE" && t.createdById === currentUserId,
        )
      : [];
  } else if (activeCategory) {
    displayLabel = activeCategory;
    displayTemplates = kindScopedGroups.get(activeCategory) || [];
  } else if (categories.length > 0) {
    const first = categories[0];
    displayLabel = first;
    displayTemplates = kindScopedGroups.get(first) || [];
  } else {
    displayLabel = "All templates";
    displayTemplates = kindFilteredTemplates;
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

  // Open use-template flow — or document attach for kind=document.
  // Document catalog templates use codes like `doc.project-charter` which are
  // outside ACTIVE_TEMPLATE_CODES, so the API marks them comingSoon. Attach is
  // live (POST .../documents/from-template) — ignore comingSoon for documents.
  const handleUseTemplate = (tpl: TemplateDto) => {
    if (!tpl.id) {
      toast.error("This template cannot be used yet");
      return;
    }
    if (tpl.kind === 'document') {
      setAttachTemplate(tpl);
      return;
    }
    if (tpl.comingSoon) {
      toast.info(`${tpl.name} is coming soon`);
      return;
    }
    setPendingTemplate(tpl);
  };

  const handlePreferredToggle = async (tpl: TemplateDto) => {
    if (!isAdmin || tpl.templateScope !== 'ORG') return;
    setPreferredBusyId(tpl.id);
    try {
      const next = !(tpl.isPreferred === true);
      const updated = await setTemplatePreferred(tpl.id, next);
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === tpl.id
            ? { ...t, isPreferred: updated.isPreferred ?? next }
            : t,
        ),
      );
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(e?.response?.data?.message || e?.message || 'Could not update preferred');
    } finally {
      setPreferredBusyId(null);
    }
  };

  const handleFlowSuccess = (projectId: string, tpl: TemplateDto) => {
    setPendingTemplate(null);
    setInstantiateError(null);
    handleClosePreview();
    onClose();
    toast.success('Project created');
    const wsId = workspaceId || activeWorkspaceId;
    if (wsId) {
      window.dispatchEvent(
        new CustomEvent('zephix:projects:invalidate', {
          detail: { workspaceId: wsId, projectId },
        }),
      );
    }
    navigate(resolvePostInstantiateProjectPath(tpl, projectId), { replace: true });
  };

  if (!open && !embedded) return null;

  const shell = (
    <>
      {/* Modal / embedded shell */}
      <div
        className={
          embedded
            ? "flex min-h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            : "fixed inset-0 z-[5001] m-auto flex flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        }
        style={embedded ? undefined : { width: "min(96vw, 1280px)", height: "min(92vh, 900px)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <Layers className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">Template center</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-slate-200 p-0.5" data-testid="template-kind-filter">
              {(
                [
                  { id: 'projects' as const, label: 'Projects' },
                  { id: 'documents' as const, label: 'Documents' },
                  { id: 'forms' as const, label: 'Forms' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setKindFilter(opt.id)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                    kindFilter === opt.id
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
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
              aria-label={embedded ? 'Back' : 'Close'}
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
              Tiers
            </div>
            <nav className="space-y-0.5 px-2 pb-3" data-testid="template-center-categories">
              {categories.length === 0 && (
                <div className="px-3 py-2 text-xs text-slate-400">
                  No categories yet
                </div>
              )}
              {categories.map((cat) => {
                const count = kindScopedGroups.get(cat)?.length ?? 0;
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
            ) : kindFilteredTemplates.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="max-w-md text-center">
                  <Layers className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-sm font-medium text-slate-700">
                    {kindFilter === 'documents'
                      ? 'No document templates yet'
                      : kindFilter === 'forms'
                        ? 'No form templates yet'
                        : 'No templates available'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {kindFilter === 'documents'
                      ? 'Document templates will appear here when your organization publishes them.'
                      : kindFilter === 'forms'
                        ? 'Form templates will appear here when your organization publishes them.'
                        : 'Templates appear here when added by your organization or platform.'}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {preferredOrgTemplates.length > 0 ? (
                  <section className="mb-6" data-testid="template-preferred-shelf">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Recommended by your organization
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Curated templates highlighted by your org admin.
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {preferredOrgTemplates.map((tpl) => (
                        <TemplateCard
                          key={`preferred-${tpl.id}`}
                          template={tpl}
                          currentUserId={currentUserId}
                          isAdmin={isAdmin}
                          preferredBusy={preferredBusyId === tpl.id}
                          onPreview={() => handlePreview(tpl)}
                          onUse={() => handleUseTemplate(tpl)}
                          onTogglePreferred={() => handlePreferredToggle(tpl)}
                        />
                      ))}
                    </div>
                  </section>
                ) : null}

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
                    {filteredTemplates
                      .filter((tpl) => !isOrgPreferredTemplate(tpl))
                      .map((tpl) => (
                      <TemplateCard
                        key={tpl.id}
                        template={tpl}
                        currentUserId={currentUserId}
                        isAdmin={isAdmin}
                        preferredBusy={preferredBusyId === tpl.id}
                        onPreview={() => handlePreview(tpl)}
                        onUse={() => handleUseTemplate(tpl)}
                        onTogglePreferred={() => handlePreferredToggle(tpl)}
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

      {/* TC-F2 multi-step Use Template flow */}
      <UseTemplateFlowModal
        open={!!pendingTemplate}
        template={pendingTemplate}
        workspaceId={workspaceId || activeWorkspaceId || ''}
        error={instantiateError}
        onClose={() => {
          setPendingTemplate(null);
          setInstantiateError(null);
        }}
        onSuccess={handleFlowSuccess}
        onError={setInstantiateError}
      />

      <AttachDocumentModal
        open={!!attachTemplate}
        template={attachTemplate}
        workspaceId={workspaceId || activeWorkspaceId || ''}
        onClose={() => setAttachTemplate(null)}
      />
    </>
  );

  if (embedded) {
    return shell;
  }

  return createPortal(
    <>
      <div className="fixed inset-0 z-[5000] bg-black/50" onClick={onClose} />
      {shell}
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
  isAdmin,
  preferredBusy,
  onPreview,
  onUse,
  onTogglePreferred,
}: {
  template: TemplateDto;
  currentUserId: string | null;
  isAdmin: boolean;
  preferredBusy?: boolean;
  onPreview: () => void;
  onUse: () => void;
  onTogglePreferred?: () => void;
}) {
  const flatPhases = template.phases || [];
  const flatTasks = template.task_templates || template.taskTemplates || [];
  const phaseCount = flatPhases.length;
  const taskCount = flatTasks.length;
  const purpose = templatePurpose(template);
  const setupLevel = deriveComplexity(template);
  const isDocument = template.kind === 'document';
  const setupChip =
    setupLevel === 'Simple'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
      : setupLevel === 'Standard'
        ? 'bg-blue-50 text-blue-700 border-blue-100'
        : 'bg-violet-50 text-violet-700 border-violet-100';

  // Document attach is live — do not surface comingSoon stub on document cards.
  const isComingSoon = !isDocument && template.comingSoon === true;
  const usageCount = template.usageCount ?? 0;
  const canTogglePreferred = isAdmin && template.templateScope === 'ORG';

  return (
    <div
      className={`group flex flex-col rounded-xl border transition ${
        isDocument
          ? 'border-slate-150 bg-slate-50/80 hover:border-slate-300 hover:bg-white'
          : isComingSoon
            ? 'border-slate-200 bg-white opacity-70'
            : 'border-slate-200 bg-white hover:border-blue-200 hover:shadow-md'
      }`}
      data-testid={`template-card-${template.id}`}
      data-kind={template.kind}
      data-coming-soon={isComingSoon ? "true" : "false"}
    >
      {!isDocument ? (
        <button
          type="button"
          onClick={onPreview}
          className="block h-28 w-full rounded-t-xl border-b border-slate-200 bg-slate-50 text-left"
          aria-label={`Preview ${template.name}`}
        >
          <TemplateBlueprint template={template} size="card" />
        </button>
      ) : (
        <div className="flex h-16 items-center rounded-t-xl border-b border-slate-200 bg-white/60 px-4">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Document
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-semibold text-slate-900">{template.name}</h4>
          <div className="flex shrink-0 items-center gap-1">
            {canTogglePreferred ? (
              <button
                type="button"
                disabled={preferredBusy}
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePreferred?.();
                }}
                title={template.isPreferred ? 'Remove preferred' : 'Mark as preferred'}
                aria-label={template.isPreferred ? 'Remove preferred' : 'Mark as preferred'}
                className="rounded p-0.5 text-amber-400 hover:bg-amber-50 disabled:opacity-50"
                data-testid={`template-preferred-star-${template.id}`}
              >
                <Star
                  className={`h-3.5 w-3.5 ${template.isPreferred ? 'fill-amber-400 text-amber-400' : ''}`}
                />
              </button>
            ) : isAdmin && template.templateScope === 'SYSTEM' ? (
              <span
                title="System templates cannot be marked preferred"
                className="rounded p-0.5 text-slate-300"
                data-testid={`template-preferred-star-${template.id}`}
              >
                <Star className="h-3.5 w-3.5" />
              </span>
            ) : template.isPreferred ? (
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
            ) : null}
            {isComingSoon ? (
              <span
                className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700"
                data-testid="template-coming-soon-badge"
              >
                Coming soon
              </span>
            ) : (
              <span
                className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500"
                data-testid="template-source-label"
              >
                {sourceLabel(template, currentUserId)}
              </span>
            )}
          </div>
        </div>

        {purpose && (
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-600">
            {purpose}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {template.methodology && (
            <span
              className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700"
              data-testid="template-card-methodology-badge"
            >
              {methodologyLabel(template.methodology)}
            </span>
          )}
          {!isDocument ? (
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${setupChip}`}
              data-testid="template-card-setup-badge"
            >
              {setupLevel}
            </span>
          ) : null}
          {usageCount > 0 ? (
            <span
              className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600"
              data-testid="template-card-usage-count"
            >
              Used {usageCount}×
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11px] text-slate-400" data-testid="template-card-structure-summary">
            {isDocument
              ? 'Attach to an existing project'
              : `${phaseCount > 0 ? `${phaseCount} phase${phaseCount !== 1 ? "s" : ""}` : "0 phases"} · ${taskCount > 0 ? `${taskCount} task${taskCount !== 1 ? "s" : ""}` : "0 tasks"}`}
          </span>
          <div className="flex gap-2">
            {!isDocument ? (
              <button
                type="button"
                onClick={onPreview}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Preview
              </button>
            ) : null}
            <button
              type="button"
              onClick={onUse}
              disabled={isComingSoon}
              aria-disabled={isComingSoon}
              title={isComingSoon ? "Coming soon" : undefined}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                isComingSoon
                  ? "cursor-not-allowed bg-slate-100 text-slate-400"
                  : isDocument
                    ? "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                    : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
              data-testid={`template-use-${template.id}`}
            >
              {isComingSoon
                ? "Coming soon"
                : isDocument
                  ? "Attach to project"
                  : "Use template"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
