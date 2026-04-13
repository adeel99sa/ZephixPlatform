import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  administrationApi,
  type GovernanceApproval,
  type GovernanceCatalogItem,
  type GovernanceHealth,
  type GovernanceQueueItem,
} from "@/features/administration/api/administration.api";
import { POLICY_UI_META } from "@/features/administration/constants/governance-policies";
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

function PoliciesTab() {
  const [catalog, setCatalog] = useState<GovernanceCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <section className="space-y-4">
      <p className="text-sm text-gray-600">
        Governance policies define rules that projects must follow. Policies are configured per
        template and inherited by projects created from that template.
      </p>

      {catalog.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-500">
          No governance policies available. The system policy catalog will be populated when the
          governance migration runs.
        </div>
      ) : (
        <div className="space-y-3">
          {catalog.map((policy) => {
            const meta = POLICY_UI_META[policy.code];
            if (!meta) return null;

            return (
              <div
                key={policy.code}
                className={`rounded-lg border p-4 ${
                  meta.tier === 3
                    ? "border-gray-100 bg-gray-50 opacity-60"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{meta.displayName}</span>
                      {meta.tier === 2 ? (
                        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
                          Enforcement coming soon
                        </span>
                      ) : null}
                      {meta.tier === 3 ? (
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
                          Coming soon
                        </span>
                      ) : null}
                      {policy.activeOnTemplates > 0 && meta.tier <= 2 ? (
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                          Active on {policy.activeOnTemplates} template
                          {policy.activeOnTemplates !== 1 ? "s" : ""}
                        </span>
                      ) : null}
                      {policy.activeOnTemplates === 0 && meta.tier <= 2 ? (
                        <span className="rounded bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
                          Not configured
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{meta.description}</p>
                    <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-gray-500">
                      {policy.entityType}
                    </p>
                    <p className="mt-1 text-[10px] text-gray-400">{meta.pmbok}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {meta.methodologies.map((m) => (
                        <span
                          key={m}
                          className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] capitalize text-gray-500"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                  {meta.tier <= 2 ? (
                    <Link
                      to="/administration/templates"
                      className="shrink-0 whitespace-nowrap text-xs text-blue-600 hover:text-blue-800"
                    >
                      Configure →
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
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
        <h1 className="text-2xl font-semibold text-gray-900">Governance</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage policy definitions, exception workflow, and approval readiness.
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
            <p className="mt-2 text-sm text-gray-500">No exceptions in queue.</p>
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
                  {taskTitle || (fromStatus && toStatus) ? (
                    <p className="mt-1 text-xs text-gray-500">
                      {taskTitle ? <span>Task: {taskTitle}</span> : null}
                      {taskTitle && fromStatus && toStatus ? <span> · </span> : null}
                      {fromStatus && toStatus ? (
                        <span>
                          {fromStatus} → {toStatus}
                        </span>
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
            <p className="mt-2 text-sm text-gray-500">No approvals found.</p>
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
