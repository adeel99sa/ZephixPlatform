import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  addWorkspaceDashboardCard,
  getDashboardCardsCatalog,
  getHomeOperationalDashboard,
  getWorkspaceOperationalDashboard,
  removeWorkspaceDashboardCard,
} from "./api";
import type {
  DashboardCardDefinition,
  DashboardCardInstance,
  DashboardCardsCatalogResponse,
  OperationalDashboardResponse,
  OperationalDashboardScope,
} from "./types";
import { CardAdvisoryTrigger } from "./components/CardAdvisoryTrigger";
import { DashboardCard, DashboardGrid } from "@/ui/patterns/DashboardGrid";
import { LoadingState } from "@/ui/components/LoadingState";
import { ErrorState } from "@/ui/components/ErrorState";
import { EmptyState } from "@/ui/components/EmptyState";
import { PageHeader } from "@/ui/components/PageHeader";
import { DashboardTemplateCenterModal } from "./DashboardTemplateCenterModal";
import { useAuth } from "@/state/AuthContext";
import { platformRoleFromUser } from "@/utils/roles";

// Cards where AI advisory adds meaningful context: risk, capacity, and schedule health indicators.
// Simple count/list cards (my_tasks_today, tasks_by_status) are excluded — no advisory value.
const ADVISORY_ELIGIBLE_CARD_KEYS = new Set([
  "projects_at_risk",
  "resource_capacity",
  "blocked_tasks",
  "overdue_tasks",
  "milestone_progress",
  "active_risks",
  "upcoming_deadlines",
  "workload_distribution",
]);

type Props = {
  scopeType: OperationalDashboardScope;
  workspaceId?: string;
};

export default function OperationalDashboardPage({ scopeType, workspaceId }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { workspaceId: routeWorkspaceId } = useParams<{ workspaceId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const resolvedWorkspaceId = workspaceId || routeWorkspaceId || "";
  const [dashboard, setDashboard] = useState<OperationalDashboardResponse | null>(null);
  const [catalog, setCatalog] = useState<DashboardCardsCatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCardCenter, setShowCardCenter] = useState(false);

  useEffect(() => {
    if (searchParams.get("openCardCenter") === "1") {
      setShowCardCenter(true);
      const next = new URLSearchParams(searchParams);
      next.delete("openCardCenter");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const loadSequence = useRef(0);

  const allCatalogCards = useMemo(() => {
    if (!catalog) return [];
    const scoped = scopeType === "home" ? catalog.home : catalog.workspace;
    return Object.values(scoped).flat();
  }, [catalog, scopeType]);

  const cardKeysInDashboard = useMemo(
    () => new Set((dashboard?.cards || []).map((card) => card.cardKey)),
    [dashboard],
  );
  const role = platformRoleFromUser(user);
  const isViewer = role === "VIEWER";
  const canManageCards = scopeType !== "home" && !isViewer;

  if (scopeType === "home") {
    return (
      <div className="bg-[var(--zs-color-surface)] p-6">
        <div className="mx-auto max-w-6xl space-y-4">
          <PageHeader
            title="Home"
            subtitle="Home ownership is handled by the dedicated OrgHomePage surface."
          />
          <EmptyState
            title="Home surface has moved"
            description="Use /home for role-aware orientation and handoff."
          />
        </div>
      </div>
    );
  }

  useEffect(() => {
    void load();
  }, [scopeType, resolvedWorkspaceId]);

  async function load() {
    const currentSequence = ++loadSequence.current;
    try {
      setLoading(true);
      setError(null);
      const [catalogData, dashboardData] = await Promise.all([
        getDashboardCardsCatalog(),
        scopeType === "home"
          ? getHomeOperationalDashboard()
          : getWorkspaceOperationalDashboard(resolvedWorkspaceId),
      ]);
      if (currentSequence !== loadSequence.current) {
        return;
      }
      setCatalog(catalogData);
      setDashboard(dashboardData);
    } catch (err: any) {
      if (currentSequence !== loadSequence.current) {
        return;
      }
      setError(err?.message || "Failed to load dashboard.");
    } finally {
      if (currentSequence === loadSequence.current) {
        setLoading(false);
      }
    }
  }

  async function handleAddCard(definition: DashboardCardDefinition) {
    if (!canManageCards) return;
    if (!dashboard) return;
    try {
      setError(null);
      await addWorkspaceDashboardCard(resolvedWorkspaceId, definition.cardKey);
      setShowCardCenter(false);
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to add dashboard card.");
    }
  }

  async function handleRemoveCard(card: DashboardCardInstance) {
    if (!canManageCards) return;
    try {
      setError(null);
      await removeWorkspaceDashboardCard(resolvedWorkspaceId, card.cardKey);
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to remove dashboard card.");
    }
  }

  return (
    <div className="bg-[var(--zs-color-surface)] p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <PageHeader
          title={dashboard?.title || "Workspace Dashboard"}
          subtitle="Operational visibility from deterministic KPI cards."
          actions={canManageCards ? (
            <button
              onClick={() => setShowCardCenter(true)}
              className="zs-btn-primary"
              aria-label="Open dashboard templates"
            >
              <Plus className="h-4 w-4" />
              Add Card
            </button>
          ) : undefined}
        />

        {loading && <LoadingState message="Loading dashboard cards..." />}
        {error && <ErrorState description={error} onRetry={() => void load()} />}

        {!loading && !error && (
          <DashboardGrid>
            {(dashboard?.cards || []).map((card) => (
              <DashboardCard
                key={card.id}
                title={card.title}
                explainTrigger={
                  scopeType === "workspace" &&
                  resolvedWorkspaceId &&
                  ADVISORY_ELIGIBLE_CARD_KEYS.has(card.cardKey) ? (
                    <CardAdvisoryTrigger
                      cardKey={card.cardKey}
                      workspaceId={resolvedWorkspaceId}
                    />
                  ) : null
                }
                actions={canManageCards ? (
                  <button
                    onClick={() => void handleRemoveCard(card)}
                    className="zs-icon-btn"
                    title="Remove card"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : undefined}
                onDrilldown={() => navigate(card.data.drilldown.route)}
              >
                <p className="text-xs text-slate-500">
                  {card.data.summary.secondaryLabel || "KPI card"}
                </p>
                <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                  {card.data.summary.primaryValue}
                </div>
                {typeof card.data.summary.secondaryValue === "number" ? (
                  <div className="text-xs text-slate-500">
                    Secondary: {card.data.summary.secondaryValue}
                  </div>
                ) : null}
              </DashboardCard>
            ))}
            {dashboard?.cards?.length === 0 ? (
              <EmptyState
                title="No cards on this dashboard"
                description="Use +Card to add operational cards."
                className="col-span-full"
              />
            ) : null}
          </DashboardGrid>
        )}
      </div>

      <DashboardTemplateCenterModal
        open={showCardCenter}
        definitions={allCatalogCards}
        existingCardKeys={cardKeysInDashboard}
        onClose={() => setShowCardCenter(false)}
        onCreate={async (definition) => {
          await handleAddCard(definition);
        }}
      />
    </div>
  );
}

