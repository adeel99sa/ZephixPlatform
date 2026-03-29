import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Shield,
  Users,
  Activity,
  ArrowRight,
} from "lucide-react";
import {
  PageHeader,
  PageHeaderLeft,
  PageHeaderRight,
  PageTitle,
  PageSubtitle,
} from "@/ui/components/PageHeader";
import {
  administrationApi,
  type GovernanceDecision,
  type GovernanceHealth,
  type WorkspaceSnapshotRow,
  type GovernanceActivityEvent,
} from "@/features/administration/api/administration.api";
import { cn } from "@/lib/utils";

function formatDate(value: string): string {
  if (!value) return "Unknown time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return date.toLocaleString();
}

function SummaryCard({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-lg border border-z-border bg-z-bg-elevated p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-z-text-tertiary">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-z-text-primary">{value ?? "—"}</p>
    </div>
  );
}

function HealthMetric({
  icon: Icon,
  label,
  score,
  status,
}: {
  icon: React.ElementType;
  label: string;
  score: number;
  status: "good" | "warning" | "critical";
}) {
  const colors = {
    good: "text-green-600 bg-green-50",
    warning: "text-amber-600 bg-amber-50",
    critical: "text-red-600 bg-red-50",
  };
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-z-bg-sunken">
      <div className={cn("p-2 rounded-md", colors[status])}>
        <Icon size={16} />
      </div>
      <div>
        <div className="text-xs text-z-text-secondary">{label}</div>
        <div className="font-semibold text-z-text-primary">{score}%</div>
      </div>
    </div>
  );
}

export default function AdministrationOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<GovernanceDecision[]>([]);
  const [health, setHealth] = useState<GovernanceHealth | null>(null);
  const [workspaceSnapshot, setWorkspaceSnapshot] = useState<WorkspaceSnapshotRow[]>([]);
  const [activity, setActivity] = useState<GovernanceActivityEvent[]>([]);

  const loadOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const [decisionData, healthData, workspaceData, activityData] = await Promise.all([
        administrationApi.listPendingDecisions({ page: 1, limit: 20 }),
        administrationApi.getGovernanceHealth(),
        administrationApi.getWorkspaceSnapshot({ page: 1, limit: 20 }),
        administrationApi.listRecentActivity(20),
      ]);
      setDecisions(decisionData.data);
      setHealth(healthData);
      setWorkspaceSnapshot(workspaceData.data);
      setActivity(activityData);
    } catch {
      setError("Failed to load administration overview.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      await loadOverview();
      if (!active) return;
    })();
    return () => {
      active = false;
    };
  }, []);

  const hasGovernanceAlerts = useMemo(() => {
    if (!health) return false;
    return (
      (health.activePolicies ?? 0) > 0 ||
      (health.capacityWarnings ?? 0) > 0 ||
      (health.budgetWarnings ?? 0) > 0 ||
      (health.hardBlocksThisWeek ?? 0) > 0
    );
  }, [health]);

  const healthScore = useMemo(() => {
    if (!health) return 85;
    const warnings = (health.capacityWarnings ?? 0) + (health.budgetWarnings ?? 0);
    const blocks = health.hardBlocksThisWeek ?? 0;
    return Math.max(0, Math.min(100, 100 - warnings * 5 - blocks * 10));
  }, [health]);

  return (
    <div className="min-h-screen bg-z-bg-sunken">
      <PageHeader variant="compact">
        <PageHeaderLeft>
          <div>
            <PageTitle>Overview</PageTitle>
            <PageSubtitle>
              Control-center summary for organization governance
            </PageSubtitle>
          </div>
        </PageHeaderLeft>
        <div />
        <PageHeaderRight>
          <Link
            to="/administration/settings"
            className="inline-flex items-center justify-center h-10 px-4 rounded-md font-medium text-sm bg-[var(--z-button-secondary-bg)] text-[var(--z-button-secondary-text)] border border-z-border hover:bg-[var(--z-button-secondary-bg-hover)] transition-all duration-z-fast"
          >
            Settings
          </Link>
        </PageHeaderRight>
      </PageHeader>

      <main className="px-8 py-8 max-w-7xl mx-auto space-y-8">
        {/* Health Score Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 p-6 bg-z-bg-elevated rounded-xl border border-z-border">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-z-text-primary">Governance Health</h2>
                <p className="text-sm text-z-text-secondary mt-1">
                  Based on security, compliance, and usage metrics
                </p>
              </div>
              <span
                className={cn(
                  "text-2xl font-bold",
                  healthScore >= 80 ? "text-green-600" : healthScore >= 60 ? "text-amber-600" : "text-red-600"
                )}
              >
                {healthScore}%
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <HealthMetric icon={Shield} label="Security" score={100} status="good" />
              <HealthMetric
                icon={Users}
                label="Access Control"
                score={(health?.capacityWarnings ?? 0) > 0 ? 75 : 100}
                status={(health?.capacityWarnings ?? 0) > 0 ? "warning" : "good"}
              />
              <HealthMetric
                icon={Activity}
                label="Activity"
                score={90}
                status="good"
              />
            </div>
          </div>
          <div className="p-6 bg-z-bg-elevated rounded-xl border border-z-border">
            <h2 className="text-lg font-semibold text-z-text-primary mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Link
                to="/administration/organization"
                className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg text-sm text-z-text-secondary hover:text-z-text-primary hover:bg-z-bg-sunken transition-colors"
              >
                Invite Users
                <ArrowRight size={14} />
              </Link>
              <Link
                to="/administration/security"
                className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg text-sm text-z-text-secondary hover:text-z-text-primary hover:bg-z-bg-sunken transition-colors"
              >
                Configure SSO
                <ArrowRight size={14} />
              </Link>
              <Link
                to="/administration/audit-log"
                className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg text-sm text-z-text-secondary hover:text-z-text-primary hover:bg-z-bg-sunken transition-colors"
              >
                Review Audit Logs
                <ArrowRight size={14} />
              </Link>
              <Link
                to="/administration/billing"
                className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg text-sm text-z-text-secondary hover:text-z-text-primary hover:bg-z-bg-sunken transition-colors"
              >
                Manage Billing
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>

      <section className="rounded-xl border border-z-border bg-z-bg-elevated overflow-hidden">
        <div className="border-b border-z-border px-6 py-4">
          <h2 className="text-sm font-semibold text-z-text-primary">Decisions Required</h2>
        </div>
        <div className="space-y-4 p-6">
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {loading ? (
            <p className="text-sm text-z-text-secondary">Loading decisions...</p>
          ) : decisions.length === 0 ? (
            <p className="text-sm text-z-text-secondary">No governance decisions pending.</p>
          ) : (
            decisions.slice(0, 5).map((decision) => (
              <div key={decision.id} className="rounded-lg border border-z-border p-4">
                <div className="grid gap-2 text-sm text-z-text-secondary md:grid-cols-5">
                  <p><span className="font-medium text-z-text-primary">Type:</span> {decision.type}</p>
                  <p><span className="font-medium text-z-text-primary">Workspace:</span> {decision.workspaceName}</p>
                  <p><span className="font-medium text-z-text-primary">Project:</span> {decision.projectName || "N/A"}</p>
                  <p><span className="font-medium text-z-text-primary">Reason:</span> {decision.reason}</p>
                  <p><span className="font-medium text-z-text-primary">Age:</span> {decision.ageHours}h</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-z-text-primary">Health Metrics</h2>
        {!hasGovernanceAlerts ? (
          <div className="rounded-xl border border-z-border bg-z-bg-elevated p-6 text-sm text-z-text-secondary">
            No governance alerts.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Active policies" value={health?.activePolicies ?? null} />
            <SummaryCard label="Capacity warnings" value={health?.capacityWarnings ?? null} />
            <SummaryCard label="Budget warnings" value={health?.budgetWarnings ?? null} />
            <SummaryCard label="Hard blocks this week" value={health?.hardBlocksThisWeek ?? null} />
          </div>
        )}
      </section>

      <section className="rounded-xl border border-z-border bg-z-bg-elevated overflow-hidden">
        <div className="border-b border-z-border px-6 py-4">
          <h2 className="text-sm font-semibold text-z-text-primary">Workspace Snapshot</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-z-bg-sunken">
              <tr className="text-left text-xs uppercase tracking-wide text-z-text-tertiary">
                <th className="px-6 py-3">Workspace Name</th>
                <th className="px-6 py-3">Project Count</th>
                <th className="px-6 py-3">Budget Status</th>
                <th className="px-6 py-3">Capacity Status</th>
                <th className="px-6 py-3">Open Exceptions</th>
              </tr>
            </thead>
            <tbody>
              {workspaceSnapshot.length === 0 ? (
                <tr>
                  <td className="px-6 py-6 text-sm text-z-text-secondary" colSpan={5}>
                    No workspaces available.
                  </td>
                </tr>
              ) : (
                workspaceSnapshot.slice(0, 8).map((workspace) => (
                  <tr key={workspace.workspaceId} className="border-t border-z-border text-sm text-z-text-secondary hover:bg-z-bg-sunken transition-colors">
                    <td className="px-6 py-4 font-medium text-z-text-primary">{workspace.workspaceName}</td>
                    <td className="px-6 py-4">{workspace.projectCount}</td>
                    <td className="px-6 py-4">{workspace.budgetStatus}</td>
                    <td className="px-6 py-4">{workspace.capacityStatus}</td>
                    <td className="px-6 py-4">{workspace.openExceptions}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-z-border bg-z-bg-elevated overflow-hidden">
        <div className="border-b border-z-border px-6 py-4">
          <h2 className="text-sm font-semibold text-z-text-primary">Recent Governance Activity</h2>
        </div>
        <div className="space-y-2 p-6">
          {activity.length === 0 ? (
            <p className="text-sm text-z-text-secondary">No recent governance activity.</p>
          ) : (
            activity.slice(0, 6).map((event) => (
              <div key={event.id} className="rounded-lg border border-z-border p-4 text-sm">
                <p className="font-medium text-z-text-primary">{event.eventType}</p>
                <p className="mt-1 text-z-text-secondary">{event.description}</p>
                <p className="mt-1 text-xs text-z-text-tertiary">
                  {formatDate(event.timestamp)} • {event.actorName || event.actorUserId || "System"}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-xl border border-z-border bg-z-bg-elevated p-6">
        <h2 className="text-sm font-semibold text-z-text-primary mb-4">All Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Link to="/administration/organization" className="rounded-lg border border-z-border px-4 py-2 text-sm text-z-text-secondary hover:bg-z-bg-sunken hover:text-z-text-primary transition-colors">Open Organization</Link>
          <Link to="/administration/users" className="rounded-lg border border-z-border px-4 py-2 text-sm text-z-text-secondary hover:bg-z-bg-sunken hover:text-z-text-primary transition-colors">Manage Users</Link>
          <Link to="/administration/access-control" className="rounded-lg border border-z-border px-4 py-2 text-sm text-z-text-secondary hover:bg-z-bg-sunken hover:text-z-text-primary transition-colors">Review Access Control</Link>
          <Link to="/administration/security" className="rounded-lg border border-z-border px-4 py-2 text-sm text-z-text-secondary hover:bg-z-bg-sunken hover:text-z-text-primary transition-colors">Open Security</Link>
          <Link to="/administration/audit-log" className="rounded-lg border border-z-border px-4 py-2 text-sm text-z-text-secondary hover:bg-z-bg-sunken hover:text-z-text-primary transition-colors">View Audit Logs</Link>
        </div>
      </section>
      </main>
    </div>
  );
}
