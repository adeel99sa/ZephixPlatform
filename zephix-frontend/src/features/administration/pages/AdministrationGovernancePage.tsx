import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ChevronDown, ChevronRight, ClipboardList, Info, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";

import { ConfirmActionDialog } from "../components/ConfirmActionDialog";
import { GovernanceManageScopeModal } from "../components/GovernanceManageScopeModal";

import {
  administrationApi,
  type GovernanceCatalogItem,
  type GovernanceHealth,
  type GovernanceQueueItem,
} from "@/features/administration/api/administration.api";
import {
  POLICY_UI_META,
  type GovernancePolicyUiMeta,
} from "@/features/administration/constants/governance-policies";
import { cn } from "@/lib/utils";

type GovernanceTab = "policies" | "exceptions" | "approvals";

const EXCEPTION_TYPE_LABELS: Record<string, { label: string; className: string }> = {
  CAPACITY: { label: "Capacity", className: "border border-neutral-200 bg-neutral-100 text-neutral-800" },
  BUDGET: { label: "Budget", className: "border border-neutral-200 bg-neutral-100 text-neutral-800" },
  PHASE_GATE: { label: "Phase gate", className: "border border-neutral-200 bg-neutral-100 text-neutral-800" },
  OWNER_ASSIGNMENT: { label: "Assignment", className: "border border-neutral-200 bg-neutral-100 text-neutral-800" },
  GOVERNANCE_RULE: { label: "Governance rule", className: "border border-neutral-200 bg-neutral-100 text-neutral-800" },
};

function formatExceptionTypeLabel(exceptionType: string): string {
  const mapped = EXCEPTION_TYPE_LABELS[exceptionType]?.label;
  if (mapped) return mapped;
  return exceptionType.replace(/_/g, " ");
}

const GOVERNANCE_EXPLAINER_KEY = "zephix-admin-governance-explainer-dismissed";

/** Engine evaluates these on task create / status / bulk today. */
const ACTIVE_POLICY_CODES = new Set(["scope-change-control", "task-completion-signoff"]);

/** Phase lifecycle checkpoints; WorkPhasesService hook still TODO. */
const PHASE_GATE_POLICY_CODES = new Set(["phase-gate-approval", "deliverable-doc-required"]);

type PolicyUiBucket = "active" | "phaseGate" | "planned";

function categorizeCatalogPolicies(
  policies: GovernanceCatalogItem[],
): Record<PolicyUiBucket, GovernanceCatalogItem[]> {
  const active: GovernanceCatalogItem[] = [];
  const phaseGate: GovernanceCatalogItem[] = [];
  const planned: GovernanceCatalogItem[] = [];
  for (const p of policies) {
    if (ACTIVE_POLICY_CODES.has(p.code)) active.push(p);
    else if (PHASE_GATE_POLICY_CODES.has(p.code)) phaseGate.push(p);
    else planned.push(p);
  }
  return { active, phaseGate, planned };
}

function formatRelativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const diff = Date.now() - t;
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const d = Math.floor(hr / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

function shortId(id: string | undefined | null): string {
  if (!id) return "—";
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

function getInitials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  if (parts.length === 1 && parts[0]!.length >= 2) return parts[0]!.slice(0, 2).toUpperCase();
  return label.slice(0, 2).toUpperCase() || "—";
}

function policyTitleFromException(item: GovernanceQueueItem): string {
  const meta = item.metadata;
  if (meta && Array.isArray(meta.policyCodes) && meta.policyCodes.length) {
    return (meta.policyCodes as string[])
      .map((c) => POLICY_UI_META[c]?.displayName ?? c)
      .join(", ");
  }
  if (meta && typeof meta.policyCode === "string") {
    return POLICY_UI_META[meta.policyCode]?.displayName ?? meta.policyCode;
  }
  return formatExceptionTypeLabel(item.exceptionType);
}

function buildExceptionContext(item: GovernanceQueueItem): string | null {
  const meta = item.metadata;
  const parts: string[] = [];
  if (item.projectName) parts.push(item.projectName);
  if (meta && typeof meta.phaseName === "string") parts.push(meta.phaseName as string);
  if (meta && typeof meta.taskTitle === "string") parts.push(`Task “${meta.taskTitle as string}”`);
  if (parts.length === 0) return null;
  return parts.join(" · ");
}

function MetricCard({
  label,
  value,
  title: tooltip,
}: {
  label: string;
  value: number;
  title?: string;
}): JSX.Element {
  return (
    <div
      title={tooltip}
      className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
    >
      <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">{value}</p>
    </div>
  );
}

function GovernanceHealthStrip({
  health,
  activePolicyTemplatesCount,
}: {
  health: GovernanceHealth | null;
  activePolicyTemplatesCount: number;
}): JSX.Element {
  return (
    <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <MetricCard
        label="Active policies"
        value={activePolicyTemplatesCount}
        title="Count of catalog policies enabled on at least one template."
      />
      <MetricCard
        label="Capacity warnings"
        value={health?.capacityWarnings ?? 0}
        title="Pending capacity-related exception requests in the queue."
      />
      <MetricCard
        label="Budget warnings"
        value={health?.budgetWarnings ?? 0}
        title="Pending budget-related exception requests in the queue."
      />
      <MetricCard
        label="Hard blocks (this week)"
        value={health?.hardBlocksThisWeek ?? 0}
        title="Reserved for future hard-block metrics; health API may return 0 until wired."
      />
    </div>
  );
}

function PolicyCard({
  policy,
  meta,
  status,
  onConfigure,
  onManageScope,
}: {
  policy: GovernanceCatalogItem;
  meta: GovernancePolicyUiMeta | null;
  status: "active" | "coming" | "planned";
  onConfigure: () => void;
  onManageScope: () => void;
}): JSX.Element {
  const title = meta?.displayName ?? policy.name;
  const description = meta?.description ?? policy.ruleDefinition?.message ?? "";
  const methodologies = meta?.methodologies ?? [];

  return (
    <div
      className={cn(
        "mb-3 rounded-lg border p-5",
        status === "active" && "border-neutral-200 bg-white shadow-sm",
        status === "coming" && "border-neutral-200 bg-neutral-50",
        status === "planned" && "border-neutral-200 bg-neutral-50",
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-medium text-neutral-900">{title}</h4>
            {status === "active" ? (
              <span className="rounded border border-neutral-300 bg-white px-2 py-0.5 text-xs font-medium text-neutral-800">
                Enforceable
              </span>
            ) : null}
            {status === "coming" ? (
              <span className="rounded border border-neutral-300 bg-white px-2 py-0.5 text-xs font-medium text-neutral-700">
                Coming soon
              </span>
            ) : null}
            {status === "planned" ? (
              <span className="rounded border border-neutral-300 bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                Planned
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-neutral-600">{description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              {policy.entityType}
            </span>
            {methodologies.length > 0 ? (
              <>
                <span className="text-neutral-300">·</span>
                <div className="flex flex-wrap gap-1">
                  {methodologies.map((m) => (
                    <span
                      key={m}
                      className="rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-xs capitalize text-neutral-700"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
        {status === "active" ? (
          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:ml-4 sm:items-end">
            <span className="text-xs text-neutral-500">
              Active on {policy.activeOnTemplates} template{policy.activeOnTemplates !== 1 ? "s" : ""}
            </span>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={onConfigure}
                className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-50"
              >
                Configure
              </button>
              <button
                type="button"
                onClick={onManageScope}
                className="rounded bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
              >
                Manage scope
              </button>
            </div>
          </div>
        ) : null}
      </div>
      {status === "active" && policy.activeOnTemplates > 0 ? (
        <p className="mt-4 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
          Projects created from templates with this policy enabled inherit it automatically.
        </p>
      ) : null}
    </div>
  );
}

function CollapsibleSection({
  title,
  dotClass,
  description,
  defaultOpen,
  children,
}: {
  title: string;
  dotClass: string;
  description: string;
  defaultOpen: boolean;
  children: ReactNode;
}): JSX.Element {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-8">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mb-3 flex w-full items-center gap-2 text-left"
      >
        {open ? <ChevronDown className="h-4 w-4 shrink-0 text-neutral-500" /> : <ChevronRight className="h-4 w-4 shrink-0 text-neutral-500" />}
        <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} aria-hidden />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-900">{title}</h3>
      </button>
      {open ? (
        <>
          <p className="mb-4 text-xs text-neutral-600">{description}</p>
          {children}
        </>
      ) : null}
    </div>
  );
}

function PoliciesTabContent({
  catalog,
  loading,
  error,
  onConfigure,
  onManageScope,
  showExplainer,
  onDismissExplainer,
}: {
  catalog: GovernanceCatalogItem[];
  loading: boolean;
  error: string | null;
  onConfigure: () => void;
  onManageScope: (policy: GovernanceCatalogItem) => void;
  showExplainer: boolean;
  onDismissExplainer: () => void;
}): JSX.Element {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
        <span className="ml-2 text-sm text-neutral-600">Loading policies…</span>
      </div>
    );
  }

  if (error) {
    return <div className="py-8 text-center text-sm font-medium text-neutral-900">{error}</div>;
  }

  const { active, phaseGate, planned } = categorizeCatalogPolicies(catalog);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Policies</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Governance policies define the rules and controls that projects follow. Policies are configured per template
          and inherited by projects created from that template.
        </p>
      </div>

      {showExplainer ? (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-neutral-600" aria-hidden />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-neutral-900">How governance works</h3>
              <p className="mt-1 text-sm text-neutral-700">
                Policies define guardrails for projects. Enable them on templates — every project created from that
                template inherits them automatically. When someone takes an action that violates a policy, they are
                blocked and can request an exception. Review exceptions in the Exceptions tab.
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 text-neutral-400 hover:text-neutral-700"
              onClick={onDismissExplainer}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      {catalog.length === 0 ? (
        <div className="py-8 text-center text-sm text-neutral-600">
          No governance policies available. The system policy catalog will be populated when the governance migration
          runs.
        </div>
      ) : (
        <>
          <CollapsibleSection
            title="Active policies"
            dotClass="bg-neutral-900"
            description="These policies are enforceable now. Toggle them on per template to activate."
            defaultOpen
          >
            {active.map((policy) => (
              <PolicyCard
                key={policy.code}
                policy={policy}
                meta={POLICY_UI_META[policy.code] ?? null}
                status="active"
                onConfigure={onConfigure}
                onManageScope={() => onManageScope(policy)}
              />
            ))}
          </CollapsibleSection>

          <CollapsibleSection
            title="Phase gate controls"
            dotClass="bg-neutral-400"
            description="Phase gates are checkpoints where projects must meet specific criteria before advancing. Enforcement is being wired — these policies will be active in a future release."
            defaultOpen
          >
            {phaseGate.map((policy) => (
              <PolicyCard
                key={policy.code}
                policy={policy}
                meta={POLICY_UI_META[policy.code] ?? null}
                status="coming"
                onConfigure={onConfigure}
                onManageScope={() => onManageScope(policy)}
              />
            ))}
          </CollapsibleSection>

          <CollapsibleSection
            title="Planned"
            dotClass="bg-neutral-300"
            description="Additional controls on the roadmap. Some definitions exist in the catalog; engine wiring will follow in future releases."
            defaultOpen
          >
            {planned.map((policy) => (
              <PolicyCard
                key={policy.code}
                policy={policy}
                meta={POLICY_UI_META[policy.code] ?? null}
                status="planned"
                onConfigure={onConfigure}
                onManageScope={() => onManageScope(policy)}
              />
            ))}
          </CollapsibleSection>
        </>
      )}
    </section>
  );
}

function ExceptionRequestCard({
  item,
  disabled,
  onApprove,
  onReject,
  onRequestInfo,
}: {
  item: GovernanceQueueItem;
  disabled: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRequestInfo: (id: string) => void;
}): JSX.Element {
  const meta = item.metadata;
  const typeStyle = EXCEPTION_TYPE_LABELS[item.exceptionType];
  const policyTitle = policyTitleFromException(item);
  const ctx = buildExceptionContext(item);
  const requestedAt = item.requestedAt || item.createdAt || "";

  return (
    <div className="mb-3 rounded-lg border border-neutral-200 bg-neutral-50 p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-neutral-700" aria-hidden />
          <span className="text-sm font-medium text-neutral-900">
            {typeStyle ? (
              <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${typeStyle.className}`}>
                {typeStyle.label}
              </span>
            ) : (
              formatExceptionTypeLabel(item.exceptionType)
            )}
          </span>
        </div>
        <span className="shrink-0 text-xs text-neutral-500">
          {requestedAt ? formatRelativeTime(requestedAt) : "—"}
        </span>
      </div>

      <p className="text-sm text-neutral-700">
        <span className="font-medium text-neutral-900">
          {meta && typeof meta.requesterLabel === "string"
            ? (meta.requesterLabel as string)
            : `Member ${shortId(item.requestedByUserId)}`}
        </span>{" "}
        requested an exception to:
      </p>
      <p className="mt-1 text-sm font-semibold text-neutral-900">“{policyTitle}”</p>

      {item.workspaceName || item.projectName ? (
        <p className="mt-2 text-sm text-neutral-600">
          {item.workspaceName}
          {item.projectName ? ` · ${item.projectName}` : ""}
        </p>
      ) : null}

      {ctx ? <p className="mt-1 text-sm text-neutral-700">Context: {ctx}</p> : null}

      {item.reason ? (
        <p className="mt-2 text-sm italic text-neutral-600">Reason: “{item.reason}”</p>
      ) : null}

      <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-neutral-200 pt-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onReject(item.id)}
          className="rounded border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-900 hover:bg-neutral-100 disabled:opacity-60"
        >
          Reject
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onRequestInfo(item.id)}
          className="rounded border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-50 disabled:opacity-60"
        >
          Request info
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onApprove(item.id)}
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
        >
          Approve exception
        </button>
      </div>
    </div>
  );
}

function ApprovalsTable({ rows }: { rows: GovernanceQueueItem[] }): JSX.Element {
  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const ta = new Date(a.updatedAt ?? a.requestedAt).getTime();
      const tb = new Date(b.updatedAt ?? b.requestedAt).getTime();
      return tb - ta;
    });
  }, [rows]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className="border-b border-neutral-200 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            <th className="py-2 pr-4">Timestamp</th>
            <th className="py-2 pr-4">Admin</th>
            <th className="py-2 pr-4">Outcome</th>
            <th className="py-2">Context</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((item) => {
            const decided = item.updatedAt ?? item.requestedAt;
            const adminLabel = item.resolvedByUserId ? shortId(item.resolvedByUserId) : "—";
            const approved = item.status === "APPROVED";
            return (
              <tr key={item.id} className="border-b border-neutral-100">
                <td className="py-3 align-top text-sm text-neutral-600">
                  {decided
                    ? new Date(decided).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "—"}
                </td>
                <td className="py-3 align-top">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[10px] font-semibold text-white">
                      {getInitials(adminLabel)}
                    </div>
                    <span className="text-sm text-neutral-900">{adminLabel}</span>
                  </div>
                </td>
                <td className="py-3 align-top">
                  <span
                    className={cn(
                      "inline-flex rounded border px-2 py-0.5 text-xs font-medium",
                      approved
                        ? "border-neutral-300 bg-white text-neutral-900"
                        : "border-neutral-300 bg-neutral-100 text-neutral-800",
                    )}
                  >
                    {approved ? "Approved" : "Rejected"}
                  </span>
                </td>
                <td className="py-3 align-top text-sm text-neutral-700">
                  {shortId(item.requestedByUserId)} → “{policyTitleFromException(item)}”
                  {item.projectName ? ` on ${item.projectName}` : ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function AdministrationGovernancePage(): JSX.Element {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<GovernanceTab>("policies");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [health, setHealth] = useState<GovernanceHealth | null>(null);
  const [queue, setQueue] = useState<GovernanceQueueItem[]>([]);
  const [catalog, setCatalog] = useState<GovernanceCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [scopePolicy, setScopePolicy] = useState<GovernanceCatalogItem | null>(null);

  const [showExplainer, setShowExplainer] = useState(() => {
    try {
      return typeof localStorage !== "undefined" && localStorage.getItem(GOVERNANCE_EXPLAINER_KEY) !== "1";
    } catch {
      return true;
    }
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setCatalogLoading(true);
    setError(null);
    setCatalogError(null);

    const results = await Promise.allSettled([
      administrationApi.getGovernanceHealth(),
      administrationApi.listGovernanceQueue({ page: 1, limit: 100 }),
      administrationApi.getGovernanceCatalog(),
    ]);

    if (results[0].status === "fulfilled") {
      setHealth(results[0].value);
    } else {
      setHealth(null);
    }

    if (results[1].status === "fulfilled") {
      setQueue(results[1].value.data);
    } else {
      setQueue([]);
    }

    if (results[2].status === "fulfilled") {
      setCatalog(results[2].value);
    } else {
      setCatalog([]);
      setCatalogError("Failed to load governance policies.");
    }

    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length === results.length) {
      setError("Failed to load governance data.");
    } else if (failed.length > 0 && results[1].status === "rejected") {
      setError("Failed to load exceptions queue.");
    } else {
      setError(null);
    }

    setLoading(false);
    setCatalogLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const pendingExceptions = useMemo(
    () => queue.filter((q) => q.status === "PENDING" || q.status === "NEEDS_INFO"),
    [queue],
  );

  const resolvedDecisions = useMemo(
    () => queue.filter((q) => q.status === "APPROVED" || q.status === "REJECTED"),
    [queue],
  );

  const activePolicyTemplatesCount = useMemo(
    () => catalog.filter((c) => c.activeOnTemplates > 0).length,
    [catalog],
  );

  const pendingBadgeCount = useMemo(
    () => queue.filter((q) => q.status === "PENDING").length,
    [queue],
  );

  const goTemplates = (): void => {
    navigate("/administration/templates");
  };

  const dismissExplainer = (): void => {
    try {
      localStorage.setItem(GOVERNANCE_EXPLAINER_KEY, "1");
    } catch {
      /* ignore */
    }
    setShowExplainer(false);
  };

  const onApprove = async (id: string): Promise<void> => {
    setActioningId(id);
    try {
      await administrationApi.approveException(id);
      await loadData();
    } catch {
      toast.error("Could not approve exception.");
    } finally {
      setActioningId(null);
    }
  };

  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [infoTargetId, setInfoTargetId] = useState<string | null>(null);

  const onReject = (id: string): void => setRejectTargetId(id);
  const onRequestInfo = (id: string): void => setInfoTargetId(id);

  const handleRejectConfirm = async (reason: string): Promise<void> => {
    if (!rejectTargetId) return;
    setActioningId(rejectTargetId);
    try {
      await administrationApi.rejectException(rejectTargetId, reason);
      await loadData();
    } catch {
      toast.error("Could not reject exception.");
    } finally {
      setActioningId(null);
    }
  };

  const handleInfoConfirm = async (question: string): Promise<void> => {
    if (!infoTargetId) return;
    setActioningId(infoTargetId);
    try {
      await administrationApi.requestMoreInfo(infoTargetId, question);
      await loadData();
    } catch {
      toast.error("Could not send request.");
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="space-y-6 text-neutral-900">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Governance</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Manage policy definitions, exception workflow, and approval readiness.
        </p>
      </header>

      <GovernanceHealthStrip health={health} activePolicyTemplatesCount={activePolicyTemplatesCount} />

      <div className="flex flex-wrap gap-2">
        {(
          [
            { key: "policies" as const, label: "Policies", badge: null as number | null },
            { key: "exceptions" as const, label: "Exceptions", badge: pendingBadgeCount },
            { key: "approvals" as const, label: "Approvals", badge: null },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.key
                ? "bg-neutral-900 text-white"
                : "text-neutral-700 hover:bg-neutral-100",
            )}
          >
            {tab.label}
            {tab.badge != null && tab.badge > 0 ? (
              <span className="ml-2 inline-flex min-w-[1.25rem] items-center justify-center rounded-full border border-neutral-800 bg-neutral-900 px-2 py-0.5 text-xs font-bold text-white">
                {tab.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {activeTab === "policies" ? (
        <PoliciesTabContent
          catalog={catalog}
          loading={catalogLoading}
          error={catalogError}
          onConfigure={goTemplates}
          onManageScope={(p) => setScopePolicy(p)}
          showExplainer={showExplainer}
          onDismissExplainer={dismissExplainer}
        />
      ) : null}

      {activeTab === "exceptions" ? (
        <section className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-900">Exceptions</h2>
          {error ? <p className="mt-2 text-sm font-medium text-neutral-900">{error}</p> : null}
          {loading ? (
            <p className="mt-2 text-sm text-neutral-600">Loading exceptions…</p>
          ) : pendingExceptions.length === 0 ? (
            <div className="py-16 text-center">
              <ShieldCheck className="mx-auto h-12 w-12 text-neutral-300" aria-hidden />
              <h3 className="mt-4 text-sm font-medium text-neutral-900">All clear</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-neutral-600">
                No pending exception requests. When a team member is blocked by a governance policy, their exception
                request will appear here for your review.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {pendingExceptions.map((item) => (
                <ExceptionRequestCard
                  key={item.id}
                  item={item}
                  disabled={actioningId === item.id}
                  onApprove={onApprove}
                  onReject={onReject}
                  onRequestInfo={onRequestInfo}
                />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {activeTab === "approvals" ? (
        <section className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-900">Approvals</h2>
          <p className="mt-1 text-xs text-neutral-600">
            Resolved exception decisions (approved or rejected). Data comes from your governance exception records.
          </p>
          {error ? <p className="mt-2 text-sm font-medium text-neutral-900">{error}</p> : null}
          {loading ? (
            <p className="mt-2 text-sm text-neutral-600">Loading decisions…</p>
          ) : resolvedDecisions.length === 0 ? (
            <div className="py-16 text-center">
              <ClipboardList className="mx-auto h-12 w-12 text-neutral-300" aria-hidden />
              <h3 className="mt-4 text-sm font-medium text-neutral-900">No decisions yet</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-neutral-600">
                Approved and rejected governance exceptions will be recorded here as your organization&apos;s governance
                decision log.
              </p>
            </div>
          ) : (
            <div className="mt-4">
              <ApprovalsTable rows={resolvedDecisions} />
            </div>
          )}
        </section>
      ) : null}

      <GovernanceManageScopeModal
        policy={scopePolicy}
        isOpen={!!scopePolicy}
        onClose={() => setScopePolicy(null)}
        onSaved={() => {
          void loadData();
        }}
      />

      <ConfirmActionDialog
        isOpen={!!rejectTargetId}
        onClose={() => setRejectTargetId(null)}
        title="Reject Exception"
        inputLabel="Reason for rejection"
        inputRequired
        confirmLabel="Reject"
        confirmVariant="destructive"
        onConfirm={handleRejectConfirm}
      />
      <ConfirmActionDialog
        isOpen={!!infoTargetId}
        onClose={() => setInfoTargetId(null)}
        title="Request More Information"
        inputLabel="What information do you need?"
        inputRequired
        confirmLabel="Send Request"
        onConfirm={handleInfoConfirm}
      />
    </div>
  );
}
