/**
 * Workspace Dashboard — Pass 1 through Pass 4
 *
 * Pass 1: Shell + 6 default cards.
 * Pass 2: Add Insight + Insight Center + addable cards.
 * Pass 2.5: Backend persistence for added cards.
 * Pass 3: Card hover actions, full-screen detail, settings/data tabs, remove.
 * Pass 4: Drag-drop reorder, card resize, persisted layout.
 */
import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Pencil, Sparkles, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { clearUserSelectLock } from "@/lib/dom/clearUserSelectLock";

import {
  getWorkspace,
  getWorkspaceSummary,
  getWorkspaceDashboardSummary,
  getWorkspaceMilestones,
  getWorkspaceRisks,
  getWorkspaceHealth,
  updateWorkspace,
  type Workspace,
  type WorkspaceSummary,
  type DashboardSummary,
  type DashboardMilestone,
  type DashboardRisksResponse,
  type WorkspaceHealthData,
} from "@/features/workspaces/api";
import { useWorkspaceRole } from "@/hooks/useWorkspaceRole";
import { useWorkspaceVisitTracker } from "@/hooks/useWorkspaceVisitTracker";
import { useWorkspaceStore } from "@/state/workspace.store";
import {
  getDefaultCards,
  getCardById,
  loadDashboardConfig,
  saveDashboardConfig,
} from "@/features/workspaces/dashboard/card-registry";
import {
  buildLayout,
  reorderLayout,
  resizeCard,
  removeFromLayout,
  type CardLayoutEntry,
  type DashboardConfig,
} from "@/features/workspaces/dashboard/layout-utils";
import { InsightCenterModal } from "@/features/workspaces/dashboard/InsightCenterModal";
import { FullScreenCardModal } from "@/features/workspaces/dashboard/FullScreenCardModal";
import { cardDataContent, cardSettingsContent, cardHasFilters, type CardDataContext } from "@/features/workspaces/dashboard/card-details";
import { CardRenderer } from "@/features/workspaces/dashboard/CardRenderer";
import { WidgetErrorBoundary } from "@/features/workspaces/dashboard/WidgetErrorBoundary";
import {
  normalizeDashboardSummary,
  normalizeMilestones,
  normalizeRisks,
  normalizeHealth,
  normalizeSummary,
} from "@/features/workspaces/dashboard/normalize";

export default function WorkspaceHomePage() {
  const { workspaceId } = useParams();
  const { setActiveWorkspace } = useWorkspaceStore();
  const { role, canWrite } = useWorkspaceRole(workspaceId);

  /* ── Workspace core state ── */
  const [ws, setWs] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  /* ── About inline edit ── */
  const [editingAbout, setEditingAbout] = useState(false);
  const [aboutText, setAboutText] = useState("");
  const [savingAbout, setSavingAbout] = useState(false);

  /* ── Dashboard data ── */
  const [summary, setSummary] = useState<WorkspaceSummary | null>(null);
  const [dashSummary, setDashSummary] = useState<DashboardSummary | null>(null);
  const [milestones, setMilestones] = useState<DashboardMilestone[] | null>(null);
  const [risks, setRisks] = useState<DashboardRisksResponse | null>(null);
  const [health, setHealth] = useState<WorkspaceHealthData | null>(null);
  const [cardsLoading, setCardsLoading] = useState(true);

  const isOwnerOrAdmin = role === "OWNER" || role === "ADMIN";

  /* ── Pass 2–4: Dashboard config, layout, Insight Center ── */
  const [insightCenterOpen, setInsightCenterOpen] = useState(false);
  const [dashConfig, setDashConfig] = useState<DashboardConfig>({ addedCards: [] });
  const [layout, setLayout] = useState<CardLayoutEntry[]>([]);
  const [fullScreenCardId, setFullScreenCardId] = useState<string | null>(null);

  // Load persisted config + build layout on mount
  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    loadDashboardConfig(workspaceId).then((cfg) => {
      if (cancelled) return;
      setDashConfig(cfg);
      setLayout(buildLayout(cfg));
    });
    return () => { cancelled = true; };
  }, [workspaceId]);

  // Set of all card IDs on the dashboard
  const existingCardIds = useMemo(() => new Set(layout.map((e) => e.cardId)), [layout]);

  useEffect(() => {
    return () => {
      clearUserSelectLock();
    };
  }, []);

  // Persist config helper
  const persistConfig = useCallback(
    async (newConfig: DashboardConfig, newLayout: CardLayoutEntry[]) => {
      if (!workspaceId) return;
      try {
        await saveDashboardConfig(workspaceId, { ...newConfig, layout: newLayout });
      } catch {
        toast.error("Failed to save dashboard layout");
      }
    },
    [workspaceId],
  );

  // Add card from Insight Center
  const handleAddCard = useCallback(
    async (cardId: string) => {
      if (!workspaceId || existingCardIds.has(cardId)) return;
      const newAdded = [...dashConfig.addedCards, cardId];
      const newConfig = { ...dashConfig, addedCards: newAdded };
      const newLayout = buildLayout(newConfig);
      setDashConfig(newConfig);
      setLayout(newLayout);
      await persistConfig(newConfig, newLayout);
      toast.success("Insight added to dashboard");
    },
    [workspaceId, dashConfig, existingCardIds, persistConfig],
  );

  // Drag-drop reorder (Pass 4)
  const handleDragEnd = useCallback(
    (result: DropResult) => {
      try {
        if (!result.destination || result.source.index === result.destination.index) return;
        const newLayout = reorderLayout(layout, result.source.index, result.destination.index);
        setLayout(newLayout);
        persistConfig(dashConfig, newLayout);
      } finally {
        clearUserSelectLock();
      }
    },
    [layout, dashConfig, persistConfig],
  );

  // Resize card (Pass 4)
  const handleResize = useCallback(
    (cardId: string, colSpan: 1 | 2) => {
      const newLayout = resizeCard(layout, cardId, colSpan);
      setLayout(newLayout);
      persistConfig(dashConfig, newLayout);
    },
    [layout, dashConfig, persistConfig],
  );

  // Remove added card (Pass 3)
  const handleRemoveCard = useCallback(
    async (cardId: string) => {
      if (!workspaceId) return;
      const defaultIds = new Set(getDefaultCards().map((c) => c.id));
      if (defaultIds.has(cardId)) return; // Cannot remove defaults
      const newAdded = dashConfig.addedCards.filter((id) => id !== cardId);
      const newConfig = { ...dashConfig, addedCards: newAdded };
      const newLayout = removeFromLayout(layout, cardId);
      setDashConfig(newConfig);
      setLayout(newLayout);
      await persistConfig(newConfig, newLayout);
      toast.success("Insight removed from dashboard");
    },
    [workspaceId, dashConfig, layout, persistConfig],
  );

  // Data context for full-screen detail
  const cardDataCtx: CardDataContext = useMemo(
    () => ({ dashSummary, summary, health, risks, milestones }),
    [dashSummary, summary, health, risks, milestones],
  );

  // Build action props for a card
  function makeActions(entry: CardLayoutEntry) {
    const defaultIds = new Set(getDefaultCards().map((c) => c.id));
    const isDefault = defaultIds.has(entry.cardId);
    return {
      canMutate: isOwnerOrAdmin,
      isDefault,
      hasFilters: cardHasFilters(entry.cardId),
      colSpan: entry.colSpan,
      onRefresh: () => loadCardData(ws?.slug),
      onFullScreen: () => setFullScreenCardId(entry.cardId),
      onFilter: cardHasFilters(entry.cardId) ? () => setFullScreenCardId(entry.cardId) : undefined,
      onSettings: isOwnerOrAdmin ? () => setFullScreenCardId(entry.cardId) : undefined,
      onRemove: isOwnerOrAdmin && !isDefault ? () => handleRemoveCard(entry.cardId) : undefined,
      onResize: isOwnerOrAdmin ? (colSpan: 1 | 2) => handleResize(entry.cardId, colSpan) : undefined,
    };
  }

  /* ── Load workspace + card data ── */
  useEffect(() => {
    if (!workspaceId) return;
    setActiveWorkspace(workspaceId);
    loadAll();
  }, [workspaceId, setActiveWorkspace]);

  useWorkspaceVisitTracker(
    ws && ws.slug ? { id: ws.id, slug: ws.slug, name: ws.name } : null,
  );

  // Refresh card data only (used by per-card Refresh action)
  const loadCardData = async (slug?: string) => {
    if (!workspaceId) return;
    setCardsLoading(true);
    try {
      const results = await Promise.allSettled([
        getWorkspaceSummary(workspaceId),
        getWorkspaceDashboardSummary(workspaceId),
        getWorkspaceMilestones(workspaceId),
        getWorkspaceRisks(workspaceId),
        slug ? getWorkspaceHealth(slug) : Promise.resolve(null),
      ]);
      // Normalize at the boundary — components receive guaranteed shapes
      if (results[0].status === "fulfilled") setSummary(normalizeSummary(results[0].value));
      if (results[1].status === "fulfilled") setDashSummary(normalizeDashboardSummary(results[1].value));
      if (results[2].status === "fulfilled") setMilestones(normalizeMilestones(results[2].value));
      if (results[3].status === "fulfilled") setRisks(normalizeRisks(results[3].value));
      if (results[4].status === "fulfilled") setHealth(normalizeHealth(results[4].value));
    } finally {
      setCardsLoading(false);
    }
  };

  const loadAll = async () => {
    if (!workspaceId) return;
    setLoading(true);
    setErr(null);
    try {
      const workspaceData = await getWorkspace(workspaceId);
      setWs(workspaceData);
      setAboutText(workspaceData.description || "");
      setLoading(false);
      await loadCardData(workspaceData.slug);
    } catch (e: any) {
      setErr(e?.message || "Failed to load workspace");
      toast.error("Failed to load workspace data");
    } finally {
      setLoading(false);
      setCardsLoading(false);
    }
  };

  const handleSaveAbout = async () => {
    if (!workspaceId) return;
    setSavingAbout(true);
    try {
      const updated = await updateWorkspace(workspaceId, { description: aboutText });
      setWs(updated);
      setEditingAbout(false);
      toast.success("Description updated");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save description");
    } finally {
      setSavingAbout(false);
    }
  };

  /* ── Error / loading / not-found states ── */
  if (!workspaceId) {
    return (
      <div className="p-6">
        <div className="text-lg font-semibold text-slate-900">Workspace not found</div>
        <Link className="text-blue-600" to="/workspaces">Back to workspaces</Link>
      </div>
    );
  }

  if (loading && !ws) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-r-transparent" />
      </div>
    );
  }

  if (err && !ws) {
    return (
      <div className="p-6">
        <div className="text-lg font-semibold text-slate-900">Error</div>
        <div className="mt-2 text-sm text-slate-500">{err}</div>
        <button
          onClick={loadAll}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!ws) return <div className="p-6 text-slate-500">Workspace not found</div>;

  return (
    <div className="mx-auto max-w-7xl p-6" data-testid="workspace-dashboard">
      {/* ── Header ── */}
      <header className="mb-8 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{ws.name}</h1>

          {/* Inline description — subtle, editable for owner */}
          {editingAbout ? (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                value={aboutText}
                onChange={(e) => setAboutText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveAbout();
                  if (e.key === "Escape") { setEditingAbout(false); setAboutText(ws.description || ""); }
                }}
                className="w-full max-w-lg rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                placeholder="Add a workspace description"
                autoFocus
              />
              <button
                onClick={handleSaveAbout}
                disabled={savingAbout}
                className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {savingAbout ? "Saving" : "Save"}
              </button>
              <button
                onClick={() => { setEditingAbout(false); setAboutText(ws.description || ""); }}
                className="rounded-md px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="mt-1 flex items-center gap-2">
              <p className="text-sm text-slate-500">
                {ws.description || "Workspace dashboard"}
              </p>
              {isOwnerOrAdmin && (
                <button
                  onClick={() => setEditingAbout(true)}
                  className="rounded p-0.5 text-slate-300 transition hover:text-slate-500"
                  aria-label="Edit description"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Top-right actions */}
        <div className="flex items-center gap-2">
          {isOwnerOrAdmin ? (
            <button
              type="button"
              onClick={() => setInsightCenterOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              <Sparkles className="h-4 w-4" />
              Add Insight
            </button>
          ) : (
            <span className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-300 cursor-default">
              <Sparkles className="h-4 w-4" />
              Add Insight
            </span>
          )}
        </div>
      </header>

      {/* ── Dashboard Card Grid with Drag-Drop (Pass 4) ── */}
      <DragDropContext onDragEnd={isOwnerOrAdmin ? handleDragEnd : () => {}}>
        <Droppable droppableId="dashboard-grid" direction="vertical">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="grid grid-cols-1 gap-5 md:grid-cols-2"
            >
              {layout.map((entry, index) => (
                <Draggable
                  key={entry.cardId}
                  draggableId={entry.cardId}
                  index={index}
                  isDragDisabled={!isOwnerOrAdmin}
                >
                  {(dragProvided, dragSnapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      className={`${entry.colSpan === 2 ? "md:col-span-2" : ""} ${
                        dragSnapshot.isDragging ? "z-10 opacity-90 shadow-xl" : ""
                      }`}
                    >
                      {/* Drag handle — visible on hover for Owner/Admin only */}
                      <div className="relative">
                        {isOwnerOrAdmin && (
                          <div
                            {...dragProvided.dragHandleProps}
                            className="absolute -left-1 top-3 z-10 rounded p-0.5 text-slate-300 opacity-0 transition-opacity group-hover/card:opacity-100 hover:text-slate-500 cursor-grab active:cursor-grabbing"
                            title="Drag to reorder"
                          >
                            <GripVertical className="h-4 w-4" />
                          </div>
                        )}
                        {!isOwnerOrAdmin && (
                          <div {...dragProvided.dragHandleProps} style={{ display: "none" }} />
                        )}
                        <WidgetErrorBoundary cardId={entry.cardId}>
                          <CardRenderer
                            cardId={entry.cardId}
                            dashSummary={dashSummary}
                            summary={summary}
                            health={health}
                            risks={risks}
                            milestones={milestones}
                            loading={cardsLoading}
                            actions={makeActions(entry)}
                          />
                        </WidgetErrorBoundary>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Insight Center modal */}
      <InsightCenterModal
        open={insightCenterOpen}
        onClose={() => setInsightCenterOpen(false)}
        existingCardIds={existingCardIds}
        onAddCard={handleAddCard}
      />

      {/* Full-screen card detail modal */}
      {fullScreenCardId && (
        <FullScreenCardModal
          open
          onClose={() => setFullScreenCardId(null)}
          title={getCardById(fullScreenCardId)?.title ?? "Card Details"}
          canMutate={isOwnerOrAdmin}
          settingsContent={cardSettingsContent(fullScreenCardId, "", () => {})}
          dataContent={cardDataContent(fullScreenCardId, cardDataCtx)}
        >
          <div className="text-sm text-slate-600">
            {cardDataContent(fullScreenCardId, cardDataCtx)}
          </div>
        </FullScreenCardModal>
      )}
    </div>
  );
}
