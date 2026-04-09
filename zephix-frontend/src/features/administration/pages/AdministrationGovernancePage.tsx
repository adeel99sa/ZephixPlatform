import { useEffect, useState } from "react";
import {
  administrationApi,
  type GovernanceApproval,
  type GovernanceHealth,
  type GovernanceQueueItem,
} from "@/features/administration/api/administration.api";
import { ConfirmActionDialog } from "../components/ConfirmActionDialog";

type GovernanceTab = "policies" | "exceptions" | "approvals";

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
    try {
      const [healthRes, queueRes, approvalsRes] = await Promise.all([
        administrationApi.getGovernanceHealth(),
        administrationApi.listGovernanceQueue({ page: 1, limit: 50 }),
        administrationApi.listGovernanceApprovals({ page: 1, limit: 50 }),
      ]);
      setHealth(healthRes);
      setQueue(queueRes.data);
      setApprovals(approvalsRes.data);
    } catch {
      setError("Failed to load governance data.");
    } finally {
      setLoading(false);
    }
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
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-gray-900">Capacity Rules</h2>
            <p className="mt-2 text-sm text-gray-600">
              Define capacity policy thresholds and exception triggers.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-gray-900">Budget Rules</h2>
            <p className="mt-2 text-sm text-gray-600">
              Configure budget constraints and escalation boundaries.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-gray-900">Phase Gates</h2>
            <p className="mt-2 text-sm text-gray-600">
              Set phase progression conditions for governance compliance.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 md:col-span-3">
            <p className="text-sm text-gray-500">
              Active policy sets: {health?.activePolicies ?? 0}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Capacity warnings: {health?.capacityWarnings ?? 0} • Budget warnings:{" "}
              {health?.budgetWarnings ?? 0} • Hard blocks this week: {health?.hardBlocksThisWeek ?? 0}
            </p>
          </div>
        </section>
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
              {queue.map((item) => (
                <div key={item.id} className="rounded border border-gray-200 p-3 text-sm text-gray-700">
                  <p className="font-medium text-gray-900">{item.exceptionType}</p>
                  <p className="mt-1">
                    {item.workspaceName} • {item.projectName || "N/A"} • {item.status}
                  </p>
                  <p className="mt-1 text-gray-600">{item.reason}</p>
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
              ))}
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
