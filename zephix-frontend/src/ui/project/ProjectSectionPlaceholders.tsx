import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/state/AuthContext";
import { EmptyState } from "@/ui/components/EmptyState";
import { ErrorState } from "@/ui/components/ErrorState";
import { LoadingState } from "@/ui/components/LoadingState";
import { DataTableWorkspace } from "@/ui/patterns/DataTableWorkspace";
import { DetailSidePanel } from "@/ui/patterns/DetailSidePanel";
import {
  createProjectReport,
  createProjectRaidItem,
  decideProjectApproval,
  getProjectApproval,
  getProjectApprovalReadiness,
  listProjectApprovals,
  listProjectRaid,
  listProjectReports,
  submitProjectApproval,
  type ApprovalDetail,
  type GovernanceReport,
  type ProjectApproval,
  type RaidItem,
} from "@/features/projects/governance.api";
import { getProjectDependencies } from "@/features/projects/governance.api";

function statusBadgeClass(status?: string): string {
  const key = (status || "").toUpperCase();
  if (["READY", "APPROVED", "GREEN", "DONE", "CLOSED"].includes(key)) return "zs-badge-ready";
  if (["BLOCKED", "AMBER", "SUBMITTED", "AT_RISK"].includes(key)) return "zs-badge-blocked";
  if (["REJECTED", "RED", "FAILED"].includes(key)) return "zs-badge-rejected";
  return "zs-badge-neutral";
}

export function ProjectApprovalsSection() {
  const navigate = useNavigate();
  const { projectId = "" } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const isViewer = (user?.platformRole || "").toUpperCase() === "VIEWER";
  const [items, setItems] = useState<ProjectApproval[]>([]);
  const [readinessById, setReadinessById] = useState<Record<string, { ready: boolean; blockingReasons: string[] }>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ApprovalDetail | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function toErrorMessage(err: any): string {
    const payload = err?.response?.data;
    const data = payload?.message || payload || err;
    const base = typeof data?.message === "string" ? data.message : "Request failed";
    const blockers = Array.isArray(data?.blockingReasons) ? data.blockingReasons.join("; ") : "";
    return blockers ? `${base}: ${blockers}` : base;
  }

  async function load() {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [approvals, readiness] = await Promise.all([
        listProjectApprovals(projectId),
        getProjectApprovalReadiness(projectId),
      ]);
      setItems(approvals.items || []);
      setReadinessById(
        Object.fromEntries(
          (readiness.items || []).map((row) => [
            row.approvalId,
            { ready: row.ready, blockingReasons: row.blockingReasons || [] },
          ]),
        ),
      );
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load approvals.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [projectId]);

  if (loading) return <LoadingState message="Loading approvals..." className="h-[60vh]" />;
  if (error) return <ErrorState description={error} onRetry={() => void load()} />;
  if (!items.length) {
    return (
      <div className="p-6">
        <EmptyState
          title="No approvals yet for this project"
          description="Create approval requests from the project plan and manage governance decisions here."
        />
        <div className="mt-3">
          <button
            className="zs-btn-secondary"
            onClick={() => navigate(`/projects/${projectId}/plan`)}
          >
            Create approval request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <DataTableWorkspace
        title="Approvals Governance Queue"
        rows={items.map((item) => ({
          id: item.id,
          phase: item.phase,
          approvalType: item.approvalType,
          readinessStatus: readinessById[item.id]?.ready ? "ready" : "not ready",
          blockerCount: readinessById[item.id]?.blockingReasons?.length || 0,
          status: (
            <span
              className={`zs-badge ${
                readinessById[item.id]?.ready
                  ? "zs-badge-ready"
                  : "zs-badge-blocked"
              }`}
            >
              {readinessById[item.id]?.ready ? "Ready" : "Blocked"}
            </span>
          ),
          requestor: item.requestorUserId || "-",
          dependencyState: readinessById[item.id]?.ready ? "Ready" : "Blocked",
          submittedAt: item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : "-",
          decidedAt: item.decidedAt ? new Date(item.decidedAt).toLocaleDateString() : "-",
          actions: (
            <button
              className="zs-btn-secondary px-2 py-1 text-xs"
              onClick={async () => {
                const detail = await getProjectApproval(projectId, item.id);
                setSelected(detail);
              }}
            >
              Open
            </button>
          ),
        }))}
        columns={[
          { key: "phase", title: "Phase" },
          { key: "approvalType", title: "Approval Type" },
          { key: "status", title: "Readiness", render: (row) => row.status as ReactNode },
          { key: "blockerCount", title: "Blockers" },
          { key: "requestor", title: "Requestor" },
          { key: "dependencyState", title: "Dependency State" },
          { key: "submittedAt", title: "Submitted" },
          { key: "decidedAt", title: "Decision" },
          { key: "actions", title: "Actions", render: (row) => row.actions as ReactNode },
        ]}
      />

      <DetailSidePanel
        open={Boolean(selected)}
        title={selected ? `Approval • ${selected.phase}` : "Approval Detail"}
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <div className="space-y-4 text-sm">
            {submitError ? (
              <div className="zs-state-error p-3 text-sm">
                {submitError}
              </div>
            ) : null}
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="mb-1 text-sm font-semibold text-slate-800">Approval overview</div>
              <div><strong>Status:</strong> {selected.status}</div>
              <div><strong>Requestor:</strong> {selected.requestorUserId || "-"}</div>
              <div><strong>Approver steps:</strong> {selected.approvers.length}</div>
            </div>
            {selected.blockingReasons.length ? (
              <div className="zs-state-warning p-3 text-sm">
                <div className="mb-1 font-semibold">Readiness blockers</div>
                <ul className="list-disc pl-5">
                  {selected.blockingReasons.map((reason, idx) => (
                    <li key={`${reason}-${idx}`}>{reason}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div>
              <div className="mb-1 font-semibold">Required evidence</div>
              <ul className="list-disc pl-5">
                {(selected.linkedEvidence || []).map((evidence, idx) => (
                  <li key={`${evidence.id}-${idx}`}>{evidence.title || evidence.id}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="mb-1 font-semibold">Missing approvers</div>
              {selected.missingApprovers.length ? (
                <ul className="list-disc pl-5">
                  {selected.missingApprovers.map((row, idx) => (
                    <li key={`${row}-${idx}`}>{row}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-600">None</p>
              )}
            </div>
            <div>
              <div className="mb-1 font-semibold">Open dependencies</div>
              {selected.openDependencies.length ? (
                <ul className="list-disc pl-5">
                  {selected.openDependencies.map((row) => (
                    <li key={row.id}>
                      {row.predecessorTitle} -&gt; {row.successorTitle}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-600">None</p>
              )}
            </div>
            <div>
              <div className="mb-1 font-semibold">Decision history</div>
              {selected.history.length ? (
                <ul className="list-disc pl-5">
                  {selected.history.map((row, idx) => (
                    <li key={`${row.userId}-${idx}`}>
                      {row.decision} by {row.userId}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-600">No decisions recorded.</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {selected.status === "DRAFT" ? (
                <button
                  disabled={isViewer}
                  className="zs-btn-primary px-3 py-1.5 text-xs"
                  onClick={async () => {
                    setSubmitError(null);
                    try {
                      await submitProjectApproval(projectId, selected.id);
                      const detail = await getProjectApproval(projectId, selected.id);
                      setSelected(detail);
                      await load();
                    } catch (err: any) {
                      setSubmitError(toErrorMessage(err));
                    }
                  }}
                >
                  Submit
                </button>
              ) : null}
              {selected.status === "SUBMITTED" ? (
                <>
                  <button
                    disabled={isViewer}
                    className="zs-btn px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700"
                    onClick={async () => {
                      await decideProjectApproval(projectId, selected.id, "APPROVED");
                      const detail = await getProjectApproval(projectId, selected.id);
                      setSelected(detail);
                      await load();
                    }}
                  >
                    Approve
                  </button>
                  <button
                    disabled={isViewer}
                    className="zs-btn-danger px-3 py-1.5 text-xs"
                    onClick={async () => {
                      await decideProjectApproval(projectId, selected.id, "REJECTED");
                      const detail = await getProjectApproval(projectId, selected.id);
                      setSelected(detail);
                      await load();
                    }}
                  >
                    Reject
                  </button>
                </>
              ) : null}
            </div>
          </div>
        ) : null}
      </DetailSidePanel>
    </div>
  );
}

export function ProjectRaidSection() {
  const { projectId = "" } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const isViewer = (user?.platformRole || "").toUpperCase() === "VIEWER";
  const [items, setItems] = useState<RaidItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<RaidItem | null>(null);
  const [typeFilter, setTypeFilter] = useState<"ALL" | "RISK" | "ASSUMPTION" | "ISSUE" | "DECISION" | "ACTION">("ALL");
  const typeOptions = [
    { key: "ALL", label: "All" },
    { key: "RISK", label: "Risks" },
    { key: "ASSUMPTION", label: "Assumptions" },
    { key: "ISSUE", label: "Issues" },
    { key: "DECISION", label: "Decisions" },
    { key: "ACTION", label: "Actions" },
  ] as const;
  const createType = typeFilter === "ALL" ? "ACTION" : typeFilter;

  async function load() {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await listProjectRaid(projectId);
      setItems(result.items || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load RAID.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [projectId]);

  const visibleItems = useMemo(
    () => (typeFilter === "ALL" ? items : items.filter((item) => item.type === typeFilter)),
    [items, typeFilter],
  );

  if (loading) return <LoadingState message="Loading RAID..." className="h-[60vh]" />;
  if (error) return <ErrorState description={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-[var(--zs-shadow-card)]">
        <div className="flex flex-wrap gap-2">
          {typeOptions.map((type) => (
            <button
              key={type.key}
              onClick={() => setTypeFilter(type.key as any)}
              className={`rounded-full border px-3 py-1 text-xs ${
                typeFilter === type.key
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-slate-300 text-slate-700"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
        <button
          disabled={isViewer}
          className="zs-btn-primary px-3 py-1.5 text-xs"
          onClick={async () => {
            await createProjectRaidItem(projectId, {
              type: createType,
              title: `New ${createType.toLowerCase()} item`,
              status: "TODO",
            });
            await load();
          }}
        >
          Create {typeOptions.find((x) => x.key === createType)?.label?.replace(/s$/, "") || "Item"}
        </button>
      </div>

      {visibleItems.length ? (
        <DataTableWorkspace
          title="RAID Register"
          rows={visibleItems.map((item) => ({
            id: item.id,
            type: item.type,
            title: item.title,
            status: <span className={`zs-badge ${statusBadgeClass(item.status)}`}>{item.status}</span>,
            owner: item.ownerUserId || "-",
            severity: item.severity || "-",
            dueDate: item.dueDate ? new Date(item.dueDate).toLocaleDateString() : "-",
            linked: `${item.linkedTaskCount} task / ${item.linkedDocCount} doc`,
            actions: (
              <button
                className="zs-btn-secondary px-2 py-1 text-xs"
                onClick={() => setSelected(item)}
              >
                Open
              </button>
            ),
          }))}
          columns={[
            { key: "type", title: "Type" },
            { key: "title", title: "Title" },
            { key: "status", title: "Status", render: (row) => row.status as ReactNode },
            { key: "owner", title: "Owner" },
            { key: "severity", title: "Priority/Severity" },
            { key: "dueDate", title: "Due" },
            { key: "linked", title: "Links" },
            { key: "actions", title: "Actions", render: (row) => row.actions as ReactNode },
          ]}
        />
      ) : (
        <EmptyState
          title={
            typeFilter === "ALL"
              ? "No RAID items"
              : `No ${typeOptions.find((x) => x.key === typeFilter)?.label.toLowerCase()}`
          }
          description="Create governance records for this project register."
        />
      )}

      <DetailSidePanel
        open={Boolean(selected)}
        title={selected ? `${selected.type} • ${selected.title}` : "RAID Detail"}
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <div className="space-y-2 text-sm">
            <div><strong>Status:</strong> {selected.status}</div>
            <div><strong>Owner:</strong> {selected.ownerUserId || "-"}</div>
            <div><strong>Priority/Severity:</strong> {selected.severity || "-"}</div>
            <div><strong>Description:</strong> {selected.description || "No description"}</div>
          </div>
        ) : null}
      </DetailSidePanel>
    </div>
  );
}

export function ProjectReportsSection() {
  const { projectId = "" } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const isViewer = (user?.platformRole || "").toUpperCase() === "VIEWER";
  const [items, setItems] = useState<GovernanceReport[]>([]);
  const [selected, setSelected] = useState<GovernanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await listProjectReports(projectId);
      setItems(result.items || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [projectId]);

  if (loading) return <LoadingState message="Loading reports..." className="h-[60vh]" />;
  if (error) return <ErrorState description={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-[var(--zs-shadow-card)]">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Structured Status Reports</h3>
          <p className="text-xs text-slate-500">Weekly reports for governance and execution health reviews.</p>
        </div>
        <button
          disabled={isViewer}
          className="zs-btn-primary px-3 py-1.5 text-xs"
          onClick={async () => {
            const created = await createProjectReport(projectId, {
              title: `Weekly report ${new Date().toLocaleDateString()}`,
              overallStatus: "AMBER",
              scheduleStatus: "AMBER",
              resourceStatus: "AMBER",
              executiveSummary: "",
              currentActivities: "",
              nextWeekActivities: "",
              helpNeeded: "",
            });
            setSelected(created);
            await load();
          }}
        >
          Create Report
        </button>
      </div>
      {items.length ? (
        <DataTableWorkspace
          title="Report Records"
          rows={items.map((report) => ({
            id: report.id,
            title: report.title,
            period: report.reportingPeriodStart
              ? `${new Date(report.reportingPeriodStart).toLocaleDateString()} - ${
                  report.reportingPeriodEnd ? new Date(report.reportingPeriodEnd).toLocaleDateString() : "ongoing"
                }`
              : "-",
            phase: report.phase || "-",
            overall: <span className={`zs-badge ${statusBadgeClass(report.overallStatus)}`}>{report.overallStatus}</span>,
            schedule: <span className={`zs-badge ${statusBadgeClass(report.scheduleStatus)}`}>{report.scheduleStatus}</span>,
            resources: <span className={`zs-badge ${statusBadgeClass(report.resourceStatus)}`}>{report.resourceStatus}</span>,
            actions: (
              <button
                className="zs-btn-secondary px-2 py-1 text-xs"
                onClick={() => setSelected(report)}
              >
                Open
              </button>
            ),
          }))}
          columns={[
            { key: "title", title: "Title" },
            { key: "period", title: "Period" },
            { key: "phase", title: "Phase" },
            { key: "overall", title: "Overall", render: (row) => row.overall as ReactNode },
            { key: "schedule", title: "Schedule", render: (row) => row.schedule as ReactNode },
            { key: "resources", title: "Resources", render: (row) => row.resources as ReactNode },
            { key: "actions", title: "Actions", render: (row) => row.actions as ReactNode },
          ]}
        />
      ) : (
        <EmptyState
          title="No reports yet for this project"
          description="Create report to start weekly governance reporting."
        />
      )}
      <DetailSidePanel
        open={Boolean(selected)}
        title={selected ? selected.title : "Report Detail"}
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <div className="space-y-3 text-sm">
            <div><strong>Phase:</strong> {selected.phase || "-"}</div>
            <div><strong>Overall:</strong> {selected.overallStatus}</div>
            <div><strong>Schedule:</strong> {selected.scheduleStatus}</div>
            <div><strong>Resources:</strong> {selected.resourceStatus}</div>
            <div>
              <div className="font-semibold">Executive summary</div>
              <p className="text-slate-700">{selected.executiveSummary || "No summary provided."}</p>
            </div>
            <div>
              <div className="font-semibold">Current activities</div>
              <p className="text-slate-700">{selected.currentActivities || "No current activities provided."}</p>
            </div>
            <div>
              <div className="font-semibold">Next week activities</div>
              <p className="text-slate-700">{selected.nextWeekActivities || "No next week activities provided."}</p>
            </div>
            <div>
              <div className="font-semibold">Help needed</div>
              <p className="text-slate-700">{selected.helpNeeded || "No help requested."}</p>
            </div>
          </div>
        ) : null}
      </DetailSidePanel>
    </div>
  );
}

export function ProjectPlanDependencyStrip() {
  const { projectId = "" } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [blockedCount, setBlockedCount] = useState(0);
  const [dependencyCount, setDependencyCount] = useState(0);
  const [dependencies, setDependencies] = useState<
    Array<{
      id: string;
      type: string;
      predecessorTitle: string;
      predecessorStatus: string | null;
      successorTitle: string;
      successorStatus: string | null;
    }>
  >([]);
  const [notReadyApprovals, setNotReadyApprovals] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openDetail, setOpenDetail] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadDependencies() {
      if (!projectId) return;
      setLoading(true);
      try {
        const [dependencyData, readinessData] = await Promise.all([
          getProjectDependencies(projectId),
          getProjectApprovalReadiness(projectId),
        ]);
        if (!mounted) return;
        setBlockedCount(dependencyData.blockedCount || 0);
        setDependencyCount((dependencyData.dependencies || []).length);
        setDependencies(dependencyData.dependencies || []);
        setNotReadyApprovals(
          (readinessData.items || []).filter((item) => item.status === "not_ready").length,
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void loadDependencies();
    return () => {
      mounted = false;
    };
  }, [projectId]);

  return (
    <>
      <div
        className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
          notReadyApprovals > 0
            ? "border-amber-200 bg-amber-50 text-amber-800"
            : "border-slate-200 bg-white text-slate-700"
        }`}
      >
        <div className="space-y-1">
          <div>
            {loading ? "Checking dependency readiness..." : "Plan governance readiness"}
          </div>
          {!loading ? (
            <div className="text-xs">
              Open dependencies: {dependencyCount} | Blocked tasks: {blockedCount} | Approval readiness:{" "}
              {notReadyApprovals > 0 ? `${notReadyApprovals} not ready` : "ready"}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpenDetail(true)}
            className="zs-btn-secondary px-2 py-1 text-xs"
          >
            View dependencies
          </button>
          <button
            onClick={() => navigate(`/projects/${projectId}/approvals`)}
            className="zs-btn-secondary px-2 py-1 text-xs"
          >
            Open approvals readiness
          </button>
        </div>
      </div>
      <DetailSidePanel
        open={openDetail}
        title="Plan Dependencies"
        onClose={() => setOpenDetail(false)}
      >
        {dependencies.length ? (
          <ul className="space-y-2 text-sm">
            {dependencies.map((dependency) => (
              <li key={dependency.id} className="rounded border border-slate-200 p-2">
                <div className="font-medium">
                  {dependency.predecessorTitle} ({dependency.predecessorStatus || "-"}) -&gt;{" "}
                  {dependency.successorTitle} ({dependency.successorStatus || "-"})
                </div>
                <div className="text-xs text-slate-500">{dependency.type}</div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No dependencies"
            description="This plan has no task dependency links yet."
          />
        )}
      </DetailSidePanel>
    </>
  );
}

