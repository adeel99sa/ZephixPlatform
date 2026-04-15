import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, Info, ShieldCheck, X } from "lucide-react";
import {
  administrationApi,
  type GovernanceApproval,
  type GovernanceCatalogItem,
  type GovernanceHealth,
  type GovernanceQueueItem,
} from "@/features/administration/api/administration.api";
import {
  POLICY_UI_META,
  type GovernancePolicyUiMeta,
} from "@/features/administration/constants/governance-policies";
import { ConfirmActionDialog } from "../components/ConfirmActionDialog";

type GovernanceTab = "policies" | "exceptions" | "approvals";

const EXCEPTION_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "text-amber-700 bg-amber-50" },
  APPROVED: { label: "Approved", className: "text-green-700 bg-green-50" },
  REJECTED: { label: "Rejected", className: "text-red-700 bg-red-50" },
  NEEDS_INFO: { label: "Needs info", className: "text-blue-700 bg-blue-50" },
  CONSUMED: { label: "Applied", className: "text-slate-600 bg-slate-100" },
};

const EXCEPTION_TYPE_LABELS: Record<string, { label: string; className: string }> = {
  CAPACITY: { label: "Capacity", className: "text-blue-600 bg-blue-50" },
  BUDGET: { label: "Budget", className: "text-amber-600 bg-amber-50" },
  PHASE_GATE: { label: "Phase gate", className: "text-purple-600 bg-purple-50" },
  OWNER_ASSIGNMENT: { label: "Assignment", className: "text-teal-600 bg-teal-50" },
  GOVERNANCE_RULE: { label: "Governance rule", className: "text-red-700 bg-red-50" },
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

function categorizeCatalogPolicies(policies: GovernanceCatalogItem[]): Record<PolicyUiBucket, GovernanceCatalogItem[]> {
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

function PolicyCard({
  policy,
  meta,
  status,
  onConfigure,
}: {
  policy: GovernanceCatalogItem;
  meta: GovernancePolicyUiMeta | null;
  status: "active" | "coming" | "planned";
  onConfigure: () => void;
}) {
  const title = meta?.displayName ?? policy.name;
  const description = meta?.description ?? policy.ruleDefinition?.message ?? "";
  const methodologies = meta?.methodologies ?? [];

  return (
    <div
      className={`mb-3 rounded-lg border p-4 ${
        status === "active"
          ? "border-gray-200 bg-white"
          : status === "coming"
            ? "border-amber-100 bg-amber-50/30"
            : "border-gray-100 bg-gray-50/50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-medium text-gray-900">{title}</h4>
            {status === "active" ? (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Enforceable</span>
            ) : null}
            {status === "coming" ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">Coming soon</span>
            ) : null}
            {status === "planned" ? (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Planned</span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-400">{policy.entityType}</span>
            {methodologies.length > 0 ? (
              <>
                <span className="text-gray-300">·</span>
                <div className="flex flex-wrap gap-1">
                  {methodologies.map((m) => (
                    <span key={m} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs capitalize text-gray-600">
                      {m}
                    </span>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
        {status === "active" ? (
          <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
            <span className="text-xs text-gray-400">
              Active on {policy.activeOnTemplates} template{policy.activeOnTemplates !== 1 ? "s" : ""}
            </span>
            <button
              type="button"
              onClick={onConfigure}
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Configure →
            </button>
          </div>
        ) : null}
      </div>
      {status === "active" && policy.activeOnTemplates > 0 ? (
        <p className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-400">
          Toggle this policy on the Templates page for each methodology template. Project instances inherit enabled
          policies automatically.
        </p>
      ) : null}
    </div>
  );
}

function PoliciesTab() {
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState<GovernanceCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExplainer, setShowExplainer] = useState(() => {
    try {
      return typeof localStorage !== "undefined" && localStorage.getItem(GOVERNANCE_EXPLAINER_KEY) !== "1";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await administrationApi.getGovernanceCatalog();
        if (active) setCatalog(data);
      } catch {
        if (active) setError("Failed to load governance policies.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const dismissExplainer = () => {
    try {
      localStorage.setItem(GOVERNANCE_EXPLAINER_KEY, "1");
    } catch {
      /* ignore */
    }
    setShowExplainer(false);
  };

  const goTemplates = () => {
    navigate("/administration/templates");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
        <span className="ml-2 text-sm text-gray-500">Loading policies...</span>
      </div>
    );
  }

  if (error) {
    return <div className="py-8 text-center text-sm text-red-600">{error}</div>;
  }

  const { active, phaseGate, planned } = categorizeCatalogPolicies(catalog);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Policies</h2>
        <p className="mt-1 text-sm text-gray-500">
          Governance policies define the rules and controls that projects follow. Policies are configured per template
          and inherited by projects created from that template.
        </p>
      </div>

      {showExplainer ? (
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" aria-hidden />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-blue-900">How governance works in Zephix</h3>
              <p className="mt-1 text-sm text-blue-700">
                Policies define guardrails for your projects. Enable policies on templates — every project created from
                that template inherits them automatically. When a team member takes an action that violates a policy,
                they are blocked and can request an exception. Admins review exceptions in the Exceptions tab.
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 text-blue-400 hover:text-blue-600"
              onClick={dismissExplainer}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      {catalog.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-500">
          No governance policies available. The system policy catalog will be populated when the governance migration
          runs.
        </div>
      ) : (
        <>
          <div className="mb-8">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-900">
              <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" aria-hidden />
              Active policies
            </h3>
            <p className="mb-4 text-xs text-gray-500">
              These policies are enforceable now. Toggle them on per template to activate.
            </p>
            {active.map((policy) => (
              <PolicyCard
                key={policy.code}
                policy={policy}
                meta={POLICY_UI_META[policy.code] ?? null}
                status="active"
                onConfigure={goTemplates}
              />
            ))}
          </div>

          <div className="mb-8">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-900">
              <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
              Phase gate controls
            </h3>
            <p className="mb-4 text-xs text-gray-500">
              Phase gates are checkpoints where projects must meet specific criteria before advancing. Enforcement is
              being wired — these policies will be active in the next release.
            </p>
            {phaseGate.map((policy) => (
              <PolicyCard
                key={policy.code}
                policy={policy}
                meta={POLICY_UI_META[policy.code] ?? null}
                status="coming"
                onConfigure={goTemplates}
              />
            ))}
          </div>

          <div className="mb-8">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-900">
              <span className="h-2 w-2 shrink-0 rounded-full bg-gray-300" aria-hidden />
              Planned
            </h3>
            <p className="mb-4 text-xs text-gray-500">
              Additional controls on the roadmap. Some definitions exist in the catalog; engine wiring will follow in
              future releases.
            </p>
            {planned.map((policy) => (
              <PolicyCard
                key={policy.code}
                policy={policy}
                meta={POLICY_UI_META[policy.code] ?? null}
                status="planned"
                onConfigure={goTemplates}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export default function AdministrationGovernancePage() {
  const [activeTab, setActiveTab] = useState<GovernanceTab>("policies");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [health, setHealth] = useState<GovernanceHealth | null>(null);
  const [queue, setQueue] = useState<GovernanceQueueItem[]>([]);
  const [approvals, setApprovals] = useState<GovernanceApproval[]>([]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const results = await Promise.allSettled([
      administrationApi.getGovernanceHealth(),
      administrationApi.listGovernanceQueue({ page: 1, limit: 50 }),
      administrationApi.listGovernanceApprovals({ page: 1, limit: 50 }),
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
      setApprovals(results[2].value.data);
    } else {
      setApprovals([]);
    }
    if (results.every((r) => r.status === "rejected")) {
      setError("Failed to load governance data.");
    }
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      await loadData();
      if (!active) return;
    })();
    return () => {
      active = false;
    };
  }, []);

  const onApprove = async (id: string) => {
    setActioningId(id);
    try {
      await administrationApi.approveException(id);
      await loadData();
    } finally {
      setActioningId(null);
    }
  };

  // MVP-2: window.prompt replaced with ConfirmActionDialog.
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [infoTargetId, setInfoTargetId] = useState<string | null>(null);

  const onReject = (id: string) => setRejectTargetId(id);
  const onRequestInfo = (id: string) => setInfoTargetId(id);

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectTargetId) return;
    setActioningId(rejectTargetId);
    try {
      await administrationApi.rejectException(rejectTargetId, reason);
      await loadData();
    } finally {
      setActioningId(null);
    }
  };

  const handleInfoConfirm = async (question: string) => {
    if (!infoTargetId) return;
    setActioningId(infoTargetId);
    try {
      await administrationApi.requestMoreInfo(infoTargetId, question);
      await loadData();
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Governance</h1>
        <p className="mt-1 text-sm text-gray-500">
          Policy catalog, exception queue, and recorded decisions. Configure which policies apply on the Templates page.
        </p>
      </header>

      <div className="flex gap-2">
        {[
          { key: "policies", label: "Policies" },
          { key: "exceptions", label: "Exceptions" },
          { key: "approvals", label: "Approvals" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as GovernanceTab)}
            className={`rounded border px-3 py-1.5 text-sm ${
              activeTab === tab.key
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "policies" ? (
        <div className="space-y-4">
          <PoliciesTab />
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">
              Active policy sets (org health): {health?.activePolicies ?? 0}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Capacity warnings: {health?.capacityWarnings ?? 0} • Budget warnings:{" "}
              {health?.budgetWarnings ?? 0} • Hard blocks this week: {health?.hardBlocksThisWeek ?? 0}
            </p>
          </div>
        </div>
      ) : null}

      {activeTab === "exceptions" ? (
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">Exceptions</h2>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
          {loading ? (
            <p className="mt-2 text-sm text-gray-500">Loading exceptions...</p>
          ) : queue.length === 0 ? (
            <div className="py-12 text-center">
              <ShieldCheck className="mx-auto h-10 w-10 text-green-300" aria-hidden />
              <h3 className="mt-3 text-sm font-medium text-gray-900">No pending exceptions</h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
                When a team member is blocked by a governance policy, they can request an exception. Pending exceptions
                will appear here for your review.
              </p>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {queue.map((item) => {
                const typeStyle = EXCEPTION_TYPE_LABELS[item.exceptionType];
                const meta = item.metadata;
                const taskTitle =
                  meta && typeof meta.taskTitle === "string" ? meta.taskTitle : null;
                const fromStatus =
                  meta && typeof meta.fromStatus === "string" ? meta.fromStatus : null;
                const toStatus =
                  meta && typeof meta.toStatus === "string" ? meta.toStatus : null;
                const actionType =
                  meta && typeof meta.actionType === "string" ? meta.actionType : null;
                const bulkOperation = Boolean(meta && meta.bulkOperation === true);
                return (
                <div key={item.id} className="rounded border border-gray-200 p-3 text-sm text-gray-700">
                  <p className="font-medium text-gray-900">
                    {typeStyle ? (
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${typeStyle.className}`}
                      >
                        {typeStyle.label}
                      </span>
                    ) : (
                      formatExceptionTypeLabel(item.exceptionType)
                    )}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-2">
                    <span>
                      {item.workspaceName} • {item.projectName || "N/A"}
                    </span>
                    {EXCEPTION_STATUS_LABELS[item.status] ? (
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-[10px] font-medium ${EXCEPTION_STATUS_LABELS[item.status].className}`}
                      >
                        {EXCEPTION_STATUS_LABELS[item.status].label}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">{item.status}</span>
                    )}
                  </p>
                  <p className="mt-1 text-gray-600">{item.reason}</p>
                  {actionType || bulkOperation || taskTitle || (fromStatus && toStatus) || (toStatus && actionType === "TASK_CREATION") ? (
                    <p className="mt-1 text-xs text-gray-500">
                      {actionType === "TASK_CREATION" ? (
                        <span className="mr-1 font-medium text-gray-600">Task creation</span>
                      ) : null}
                      {bulkOperation ? (
                        <span className="mr-1 rounded bg-slate-100 px-1 py-0.5 text-[10px] text-slate-600">
                          Bulk
                        </span>
                      ) : null}
                      {taskTitle ? <span>Task: {taskTitle}</span> : null}
                      {taskTitle && (fromStatus || toStatus) ? <span> · </span> : null}
                      {fromStatus && toStatus ? (
                        <span>
                          {fromStatus} → {toStatus}
                        </span>
                      ) : toStatus && actionType === "TASK_CREATION" ? (
                        <span>Initial status: {toStatus}</span>
                      ) : null}
                    </p>
                  ) : null}
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      disabled={actioningId === item.id}
                      onClick={() => onApprove(item.id)}
                      className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-60"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={actioningId === item.id}
                      onClick={() => onReject(item.id)}
                      className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-60"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      disabled={actioningId === item.id}
                      onClick={() => onRequestInfo(item.id)}
                      className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-60"
                    >
                      Request Info
                    </button>
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </section>
      ) : null}

      {activeTab === "approvals" ? (
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">Approvals</h2>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
          {loading ? (
            <p className="mt-2 text-sm text-gray-500">Loading approvals...</p>
          ) : approvals.length === 0 ? (
            <div className="py-12 text-center">
              <ClipboardList className="mx-auto h-10 w-10 text-gray-300" aria-hidden />
              <h3 className="mt-3 text-sm font-medium text-gray-900">No approvals yet</h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
                Approved and rejected governance exceptions will be recorded here as an audit trail of governance
                decisions.
              </p>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {approvals.map((item) => (
                <div key={item.id} className="rounded border border-gray-200 p-3 text-sm text-gray-700">
                  <p className="font-medium text-gray-900">{item.type}</p>
                  <p className="mt-1">
                    Status: {item.status} • Approvals: {item.receivedApprovals}/{item.requiredApprovals}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

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
