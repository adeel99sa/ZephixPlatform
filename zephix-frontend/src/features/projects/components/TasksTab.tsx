import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
} from "react";
import { useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Ban, ListTodo, Pause } from "lucide-react";

import { GateDecisionModal } from "./GateDecisionModal";
import { GateRecordModal } from "./GateRecordModal";
import { GateSubmitModal } from "./GateSubmitModal";
import { selectCompletedGateArtifactTasksForSubmit } from "./gateArtifactTasks";
import type { GateSubmitArtifactRow } from "./gateSubmit.types";
import { approversFromApprovalChain } from "./gateSubmitModal.adapter";
import type { InlinePhaseGate } from "./inline-phase-gate.types";
import { toInlinePhaseGateFromApi } from "./inlinePhaseGate.adapter";
import { PhaseGroup, type AssigneeLookup, type PhaseGroupSurfaceTone } from "./PhaseGroup";
import { TaskListToolbar } from "./TaskListToolbar";
import { isPhaseAddTaskAllowed } from "./tasks-tab.utils";

import { EmptyState } from "@/components/ui/feedback/EmptyState";
import {
  getApprovalChain,
  getGateDefinition,
} from "@/features/phase-gates/phaseGates.api";
import {
  createTask,
  listPhasesForProject,
  listTasks,
  type WorkPhaseListItem,
  type WorkTask,
} from "@/features/work-management/workTasks.api";
import { invalidateStatsCache } from "@/features/work-management/workTasks.stats.api";
import { listProjectApprovals } from "@/features/projects/governance.api";
import { projectKeys, useProject } from "@/features/projects/hooks";
import { buildTaskListSections } from "@/features/projects/utils/taskListPhaseGrouping";
import { listWorkspaceMembers } from "@/features/workspaces/workspace.api";
import { useWorkspaceRole } from "@/hooks/useWorkspaceRole";
import { getErrorMessage } from "@/lib/api/errors";
import { useAuth } from "@/state/AuthContext";
import { useWorkspaceStore } from "@/state/workspace.store";
import { isGuestUser } from "@/utils/roles";

type WorkspaceMember = {
  id: string;
  userId: string;
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
};

function buildAssigneeLookup(members: WorkspaceMember[]): AssigneeLookup {
  const map: AssigneeLookup = new Map();
  for (const m of members) {
    const u = m.user;
    if (!u) {
      continue;
    }
    const label =
      u.firstName && u.lastName
        ? `${u.firstName} ${u.lastName}`
        : u.email;
    const initials =
      `${u.firstName?.[0] ?? ""}${u.lastName?.[0] ?? ""}`.trim() ||
      u.email?.[0]?.toUpperCase() ||
      "?";
    map.set(m.userId, { label, initials: initials.slice(0, 2).toUpperCase() });
  }
  return map;
}

export type TasksTabProps = {
  /** When omitted (e.g. execution route), read from URL + workspace store. */
  projectId?: string;
  workspaceId?: string;
};

/**
 * Governed task list (C-2): phase grouping, toolbar, columns — no inline phase gates (C-3).
 */
export function TasksTab({
  projectId: projectIdProp,
  workspaceId: workspaceIdProp,
}: TasksTabProps = {}): ReactElement {
  const { projectId: projectIdParam } = useParams<{ projectId: string }>();
  const {
    getWorkspaceMembers,
    setWorkspaceMembers,
    activeWorkspaceId,
  } = useWorkspaceStore();
  const projectId = projectIdProp ?? projectIdParam ?? "";
  const workspaceId = workspaceIdProp ?? activeWorkspaceId ?? "";
  const { user } = useAuth();
  const { isReadOnly } = useWorkspaceRole(workspaceId);

  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [phases, setPhases] = useState<WorkPhaseListItem[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showClosed, setShowClosed] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [createPhaseId, setCreatePhaseId] = useState<string | null>(null);
  const [quickTitle, setQuickTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [phaseInlineGates, setPhaseInlineGates] = useState<
    Record<string, InlinePhaseGate | null>
  >({});
  const [gateSubmitContext, setGateSubmitContext] = useState<{
    phaseId: string;
    phaseName: string;
    gate: InlinePhaseGate;
  } | null>(null);
  const [gateSubmitApprovers, setGateSubmitApprovers] = useState<
    ReturnType<typeof approversFromApprovalChain>
  >([]);
  const [gateSubmitApproversLoading, setGateSubmitApproversLoading] =
    useState(false);
  const [gateDecisionContext, setGateDecisionContext] = useState<{
    phaseName: string;
    gate: InlinePhaseGate;
    approvalId: string;
  } | null>(null);
  const [gateRecordPhaseId, setGateRecordPhaseId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const hasWorkspaceMismatch =
    !activeWorkspaceId || activeWorkspaceId !== workspaceId;

  const { data: projectDetail } = useProject(projectId || undefined, {
    enabled: Boolean(projectId && !hasWorkspaceMismatch),
  });
  const projectLifecycleState = projectDetail?.state;
  /** C-6 freeze: derived only from backend `Project.state` (via `useProject` / GET /projects/:id). */
  const tasksSurfaceFrozen =
    projectLifecycleState === "ON_HOLD" ||
    projectLifecycleState === "TERMINATED";

  const isGuest = isGuestUser(user);
  const canAddTask = !isReadOnly && !isGuest;
  /** C-6: creation / gate actions — blocked when project lifecycle freezes work (backend state). */
  const canMutateTasksSurface = canAddTask && !tasksSurfaceFrozen;
  const phaseSurfaceTone: PhaseGroupSurfaceTone =
    projectLifecycleState === "ON_HOLD"
      ? "on_hold"
      : projectLifecycleState === "TERMINATED"
        ? "terminated"
        : "default";

  const sortedPhases = useMemo(
    () => [...phases].sort((a, b) => a.sortOrder - b.sortOrder),
    [phases],
  );

  const assigneeLookup = useMemo(
    () => buildAssigneeLookup(members),
    [members],
  );

  const loadMembers = useCallback(async () => {
    if (!workspaceId) {
      return;
    }
    const cached = getWorkspaceMembers(workspaceId);
    if (cached) {
      setMembers(cached as WorkspaceMember[]);
      return;
    }
    try {
      const raw = await listWorkspaceMembers(workspaceId);
      const normalized = (raw || [])
        .filter(
          (m): m is WorkspaceMember =>
            typeof (m as WorkspaceMember).userId === "string" &&
            (m as WorkspaceMember).userId.length > 0,
        )
        .map((member) => {
          const base = { id: member.id, userId: member.userId };
          if (member.user) {
            return {
              ...base,
              user: {
                ...member.user,
                id: member.user.id || member.userId,
              },
            };
          }
          return base;
        });
      setWorkspaceMembers(workspaceId, normalized);
      setMembers(normalized);
    } catch {
      setMembers([]);
    }
  }, [getWorkspaceMembers, setWorkspaceMembers, workspaceId]);

  const loadTasks = useCallback(async () => {
    if (!projectId || !workspaceId || hasWorkspaceMismatch) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [result, phaseRows] = await Promise.all([
        listTasks({ projectId }),
        listPhasesForProject(projectId).catch(() => [] as WorkPhaseListItem[]),
      ]);
      setTasks(Array.isArray(result.items) ? result.items : []);
      setPhases(Array.isArray(phaseRows) ? phaseRows : []);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e));
      setTasks([]);
      setPhases([]);
    } finally {
      setLoading(false);
    }
  }, [hasWorkspaceMismatch, projectId, workspaceId]);

  /**
   * Re-fetch GET gate per phase and map with {@link toInlinePhaseGateFromApi} only — no local gate flags.
   * After submit, gate state can change without the phase list changing; call this from success handlers.
   */
  const refetchInlinePhaseGates = useCallback(async () => {
    if (!projectId || hasWorkspaceMismatch) {
      setPhaseInlineGates({});
      return;
    }
    const phaseRows = await listPhasesForProject(projectId).catch(
      () => [] as WorkPhaseListItem[],
    );
    const pList = Array.isArray(phaseRows) ? phaseRows : [];
    if (pList.length === 0) {
      setPhaseInlineGates({});
      return;
    }
    const next: Record<string, InlinePhaseGate | null> = {};
    await Promise.all(
      pList.map(async (p) => {
        try {
          const raw = await getGateDefinition(projectId, p.id);
          next[p.id] = toInlinePhaseGateFromApi(raw);
        } catch {
          next[p.id] = null;
        }
      }),
    );
    setPhaseInlineGates(next);
  }, [hasWorkspaceMismatch, projectId]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  /** C-3: inline gate row data — refetched after submit via {@link refetchInlinePhaseGates}. */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!projectId || hasWorkspaceMismatch) {
        if (!cancelled) {
          setPhaseInlineGates({});
        }
        return;
      }
      await refetchInlinePhaseGates();
    })();
    return () => {
      cancelled = true;
    };
  }, [hasWorkspaceMismatch, projectId, refetchInlinePhaseGates]);

  /** C-4: load approval chain for submit modal (read-only approver list). */
  useEffect(() => {
    if (!gateSubmitContext) {
      setGateSubmitApprovers([]);
      setGateSubmitApproversLoading(false);
      return;
    }
    let cancelled = false;
    setGateSubmitApproversLoading(true);
    void getApprovalChain(gateSubmitContext.gate.id)
      .then((chain) => {
        if (!cancelled) {
          setGateSubmitApprovers(approversFromApprovalChain(chain));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGateSubmitApprovers([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setGateSubmitApproversLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [gateSubmitContext]);

  const filteredTasks = useMemo(() => {
    let list = tasks;
    if (!showClosed) {
      list = list.filter(
        (t) => t.status !== "DONE" && t.status !== "CANCELED",
      );
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((t) => t.title.toLowerCase().includes(q));
    }
    return list;
  }, [tasks, showClosed, searchQuery]);

  /**
   * Phase lifecycle for **create** gating must use full project tasks, not
   * search/filtered rows — otherwise an empty ACTIVE phase (zero tasks) would
   * incorrectly block "+ Task".
   */
  const governanceTasksByPhaseId = useMemo(() => {
    const m = new Map<string, WorkTask[]>();
    for (const t of tasks) {
      if (!t.phaseId) {
        continue;
      }
      const arr = m.get(t.phaseId) ?? [];
      arr.push(t);
      m.set(t.phaseId, arr);
    }
    return m;
  }, [tasks]);

  const hasActivePhase = useMemo(
    () =>
      sortedPhases.some((ph) =>
        isPhaseAddTaskAllowed(
          ph,
          governanceTasksByPhaseId.get(ph.id) ?? [],
        ),
      ),
    [sortedPhases, governanceTasksByPhaseId],
  );

  const firstActivePhaseId = useMemo(() => {
    const found = sortedPhases.find((ph) =>
      isPhaseAddTaskAllowed(
        ph,
        governanceTasksByPhaseId.get(ph.id) ?? [],
      ),
    );
    return found?.id ?? null;
  }, [sortedPhases, governanceTasksByPhaseId]);

  const sections = useMemo(
    () => buildTaskListSections(phases, filteredTasks),
    [phases, filteredTasks],
  );

  const openGateSubmitForPhase = useCallback(
    (phaseId: string, phaseName: string, gate: InlinePhaseGate) => {
      if (!canMutateTasksSurface || gate.state !== "READY") {
        return;
      }
      /** C-8: Blockers from API — do not open submit while conditions are open. */
      if ((gate.blockedByConditionsCount ?? 0) > 0) {
        return;
      }
      setGateSubmitContext({ phaseId, phaseName, gate });
    },
    [canMutateTasksSurface],
  );

  const openGateRecordForPhase = useCallback(
    (phaseId: string) => {
      if (!projectId || hasWorkspaceMismatch) {
        return;
      }
      setGateRecordPhaseId(phaseId);
    },
    [hasWorkspaceMismatch, projectId],
  );

  const openGateDecisionForPhase = useCallback(
    async (phaseName: string, gate: InlinePhaseGate) => {
      if (
        !canMutateTasksSurface ||
        gate.state !== "IN_REVIEW" ||
        !projectId ||
        hasWorkspaceMismatch
      ) {
        return;
      }
      try {
        /** C-8: Gate actions disabled when backend reports open conditions. */
        if ((gate.blockedByConditionsCount ?? 0) > 0) {
          return;
        }
        const { items } = await listProjectApprovals(projectId);
        // MVP: match SUBMITTED + gateDefinitionId. When recycle/history grows, prefer an explicit
        // "current approval id" from the gate/phases API instead of filtering the list.
        const row = items.find(
          (i) =>
            i.gateDefinitionId === gate.id && i.status === "SUBMITTED",
        );
        if (!row?.id) {
          toast.error("No submitted approval record found for this gate.");
          return;
        }
        setGateDecisionContext({
          phaseName,
          gate,
          approvalId: row.id,
        });
      } catch (e: unknown) {
        toast.error(getErrorMessage(e));
      }
    },
    [canMutateTasksSurface, hasWorkspaceMismatch, projectId],
  );

  const gateSubmitArtifactRows = useMemo((): GateSubmitArtifactRow[] => {
    if (!gateSubmitContext) {
      return [];
    }
    const phase =
      sortedPhases.find((p) => p.id === gateSubmitContext.phaseId) ?? null;
    const inPhase =
      governanceTasksByPhaseId.get(gateSubmitContext.phaseId) ?? [];
    const base = selectCompletedGateArtifactTasksForSubmit(inPhase, phase);
    return base.map((row) => {
      const t = inPhase.find((x) => x.id === row.id);
      const uid = t?.assigneeUserId;
      const a = uid ? assigneeLookup.get(uid) : undefined;
      return {
        ...row,
        assigneeLabel: a?.label,
        assigneeInitials: a?.initials,
      };
    });
  }, [gateSubmitContext, governanceTasksByPhaseId, sortedPhases, assigneeLookup]);

  const handleGateSubmitSuccess = useCallback(async () => {
    await loadTasks();
    await refetchInlinePhaseGates();
    invalidateStatsCache();
    queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
  }, [loadTasks, projectId, queryClient, refetchInlinePhaseGates]);

  const openQuickCreate = useCallback(
    (phaseId: string | null) => {
      if (!canMutateTasksSurface) {
        return;
      }
      const resolved = phaseId ?? firstActivePhaseId;
      if (!resolved) {
        return;
      }
      setCreatePhaseId(resolved);
      setQuickTitle("");
      setQuickCreateOpen(true);
    },
    [canMutateTasksSurface, firstActivePhaseId],
  );

  const handleToolbarAddTask = useCallback(() => {
    if (!firstActivePhaseId || !canMutateTasksSurface) {
      return;
    }
    openQuickCreate(firstActivePhaseId);
  }, [canMutateTasksSurface, firstActivePhaseId, openQuickCreate]);

  const submitQuickCreate = useCallback(async () => {
    const title = quickTitle.trim();
    if (!title || !projectId || hasWorkspaceMismatch) {
      return;
    }
    setCreating(true);
    try {
      await createTask({
        projectId,
        title,
        phaseId: createPhaseId ?? undefined,
      });
      invalidateStatsCache();
      setQuickTitle("");
      setQuickCreateOpen(false);
      await loadTasks();
      toast.success("Task created");
    } catch (e: unknown) {
      toast.error(getErrorMessage(e));
    } finally {
      setCreating(false);
    }
  }, [
    createPhaseId,
    hasWorkspaceMismatch,
    loadTasks,
    projectId,
    quickTitle,
  ]);

  if (!projectId) {
    return (
      <EmptyState
        title="Project not found"
        description="Unable to load tasks without a project."
        icon={<ListTodo className="h-12 w-12" />}
      />
    );
  }

  if (!workspaceId) {
    return (
      <EmptyState
        title="No workspace selected"
        description="Please select a workspace to view tasks."
        icon={<ListTodo className="h-12 w-12" />}
      />
    );
  }

  if (hasWorkspaceMismatch) {
    return (
      <EmptyState
        title="Workspace mismatch"
        description="Select the correct workspace to view tasks."
        icon={<ListTodo className="h-12 w-12" />}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center bg-slate-50/50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50/30">
      {projectLifecycleState === "ON_HOLD" ? (
        <div
          className="flex shrink-0 items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-950"
          role="status"
        >
          <Pause className="h-4 w-4 shrink-0" aria-hidden />
          <span>Project is On Hold. All work is frozen.</span>
        </div>
      ) : null}
      {projectLifecycleState === "TERMINATED" ? (
        <div
          className="flex shrink-0 items-center gap-2 border-b border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-950"
          role="status"
        >
          <Ban className="h-4 w-4 shrink-0" aria-hidden />
          <span>Project is Terminated. No further action allowed.</span>
        </div>
      ) : null}

      <TaskListToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showClosed={showClosed}
        onShowClosedChange={setShowClosed}
        onAddTask={handleToolbarAddTask}
        addTaskDisabled={!canMutateTasksSurface || !hasActivePhase}
        surfaceInteractionLocked={tasksSurfaceFrozen}
      />

      {quickCreateOpen && canMutateTasksSurface && hasActivePhase ? (
        <div className="border-b border-slate-200 bg-indigo-50/40 px-4 py-3">
          <div className="mx-auto flex max-w-3xl flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="tasks-tab-quick-title"
                className="mb-1 block text-xs font-medium text-slate-600"
              >
                New task title
              </label>
              <input
                id="tasks-tab-quick-title"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void submitQuickCreate();
                  }
                }}
                placeholder="What needs to be done?"
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setQuickCreateOpen(false);
                  setQuickTitle("");
                }}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={creating || !quickTitle.trim()}
                onClick={() => void submitQuickCreate()}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {creating ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex-1 overflow-auto px-4 py-4">
        {filteredTasks.length === 0 && tasks.length > 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600">
            No tasks match your filters. Try adjusting search or enable{" "}
            <span className="font-medium">Show closed</span>.
          </div>
        ) : tasks.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8">
            <EmptyState
              title="No tasks yet"
              description="Create the first task for this project to start execution."
              icon={<ListTodo className="h-12 w-12 text-slate-400" />}
              action={
                canMutateTasksSurface && hasActivePhase ? (
                  <button
                    type="button"
                    onClick={handleToolbarAddTask}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    + Task
                  </button>
                ) : undefined
              }
            />
          </div>
        ) : (
          sections.map((section) => {
            if (section.kind === "unassigned") {
              return (
                <PhaseGroup
                  key="unassigned"
                  phase={null}
                  phaseLabel="Unassigned"
                  tasks={section.tasks}
                  assigneeLookup={assigneeLookup}
                  surfaceInteractionLocked={tasksSurfaceFrozen}
                  surfaceTone={phaseSurfaceTone}
                  // Unassigned inline add: same governance as toolbar — only when
                  // user may create AND at least one phase is ACTIVE (no bypass).
                  onRequestAddTask={
                    canMutateTasksSurface && hasActivePhase
                      ? () => openQuickCreate(null)
                      : undefined
                  }
                />
              );
            }
            const gateRow = phaseInlineGates[section.phase.id] ?? null;
            return (
              <PhaseGroup
                key={section.phase.id}
                phase={section.phase}
                phaseLabel={section.phase.name}
                tasks={section.tasks}
                assigneeLookup={assigneeLookup}
                surfaceInteractionLocked={tasksSurfaceFrozen}
                surfaceTone={phaseSurfaceTone}
                cycleBadgeNumber={gateRow?.cycleNumber ?? null}
                inlineGate={gateRow}
                onRequestGateSubmit={
                  canMutateTasksSurface && gateRow?.state === "READY"
                    ? () =>
                        openGateSubmitForPhase(
                          section.phase.id,
                          section.phase.name,
                          gateRow,
                        )
                    : undefined
                }
                onRequestGateReview={
                  canMutateTasksSurface && gateRow?.state === "IN_REVIEW"
                    ? () =>
                        void openGateDecisionForPhase(
                          section.phase.name,
                          gateRow,
                        )
                    : undefined
                }
                onRequestGateRecord={
                  gateRow?.state === "DECIDED"
                    ? () => openGateRecordForPhase(section.phase.id)
                    : undefined
                }
                onRequestGateHistory={
                  gateRow &&
                  gateRow.state === "IN_REVIEW" &&
                  typeof gateRow.cycleNumber === "number" &&
                  gateRow.cycleNumber > 1
                    ? () => openGateRecordForPhase(section.phase.id)
                    : undefined
                }
                onRequestAddTask={
                  canMutateTasksSurface &&
                  isPhaseAddTaskAllowed(section.phase, section.tasks)
                    ? () => openQuickCreate(section.phase.id)
                    : undefined
                }
              />
            );
          })
        )}
      </div>

      {gateSubmitContext ? (
        <GateSubmitModal
          open
          onClose={() => setGateSubmitContext(null)}
          onSuccess={handleGateSubmitSuccess}
          projectId={projectId}
          phaseId={gateSubmitContext.phaseId}
          phaseName={gateSubmitContext.phaseName}
          gate={gateSubmitContext.gate}
          artifactTasks={gateSubmitArtifactRows}
          approvers={gateSubmitApprovers}
          approversLoading={gateSubmitApproversLoading}
        />
      ) : null}

      {gateDecisionContext ? (
        <GateDecisionModal
          open
          onClose={() => setGateDecisionContext(null)}
          onSuccess={handleGateSubmitSuccess}
          projectId={projectId}
          approvalId={gateDecisionContext.approvalId}
          gateName={gateDecisionContext.gate.name}
          phaseName={gateDecisionContext.phaseName}
          tasks={tasks}
          phases={sortedPhases}
          assigneeLookup={assigneeLookup}
          canSubmitDecision={canMutateTasksSurface}
        />
      ) : null}

      {gateRecordPhaseId ? (
        <GateRecordModal
          open
          onClose={() => setGateRecordPhaseId(null)}
          projectId={projectId}
          phaseId={gateRecordPhaseId}
          memberLookup={assigneeLookup}
        />
      ) : null}
    </div>
  );
}
