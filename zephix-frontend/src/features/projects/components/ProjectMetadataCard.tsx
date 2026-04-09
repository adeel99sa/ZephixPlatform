/**
 * ProjectMetadataCard — Phase 2 + Phase 3
 *
 * Canonical first-page metadata block for template-created projects.
 * Renders core project context AND owns the project team management UI.
 *
 * Phase 3 changes:
 *  - Fetches project team via projectsApi.getProjectTeam()
 *  - Filters the displayed team to teamMemberIds (subset of workspace members)
 *  - Provides "Add" / "Remove" controls for owners (Overview owns team editing)
 *  - On team mutation, invalidates project query so Activities re-reads
 *
 * Hard rules:
 *  - No mock data, no decorative cards with fake content
 *  - If a section has no real data, show honest empty state
 *  - PM is always implicitly part of the team (cannot be removed via this UI)
 */
import { useEffect, useState, useMemo } from "react";
import { Users, FileText, Layers, Loader2, Plus, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { listWorkspaceMembers, type WorkspaceMember } from "@/features/workspaces/workspace.api";
import { projectsApi, type ProjectDetail } from "@/features/projects/projects.api";

interface PhaseSummary {
  id: string;
  name: string;
  sortOrder: number;
  isMilestone?: boolean;
}

interface ProjectDoc {
  id: string;
  title: string;
  updatedAt?: string;
}

interface ProjectMetadataCardProps {
  project: ProjectDetail;
  workspaceId: string;
  /** Optional: delivery owner / project manager user ID from overview API */
  deliveryOwnerUserId?: string | null;
  /** Whether the current user can edit project metadata (e.g. workspace member+) */
  canEdit?: boolean;
  /** Phase 5A.6: shown in essentials strip (identity frame already covers headline metadata). */
  structureLocked?: boolean;
  projectState?: string;
}

export function ProjectMetadataCard({
  project,
  workspaceId,
  deliveryOwnerUserId,
  canEdit = false,
  structureLocked,
  projectState,
}: ProjectMetadataCardProps) {
  const queryClient = useQueryClient();
  const [phases, setPhases] = useState<PhaseSummary[] | null>(null);
  const [phasesLoading, setPhasesLoading] = useState(true);
  const [members, setMembers] = useState<WorkspaceMember[] | null>(null);
  const [membersLoading, setMembersLoading] = useState(true);
  const [docs, setDocs] = useState<ProjectDoc[] | null>(null);
  const [docsLoading, setDocsLoading] = useState(true);

  // Phase 3: per-project team membership
  const [teamMemberIds, setTeamMemberIds] = useState<string[]>([]);
  const [teamLoading, setTeamLoading] = useState(true);
  const [teamMutating, setTeamMutating] = useState(false);
  const [showAddPicker, setShowAddPicker] = useState(false);

  // Load phases from project plan endpoint
  useEffect(() => {
    let cancelled = false;
    setPhasesLoading(true);
    api
      .get(`/work/projects/${project.id}/plan`)
      .then((res: any) => {
        if (cancelled) return;
        const planData = res?.data ?? res;
        const phasesRaw = Array.isArray(planData?.phases) ? planData.phases : [];
        setPhases(
          phasesRaw.map((p: any) => ({
            id: p.id,
            name: p.name,
            sortOrder: p.sortOrder ?? 0,
            isMilestone: p.isMilestone,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setPhases([]);
      })
      .finally(() => {
        if (!cancelled) setPhasesLoading(false);
      });
    return () => { cancelled = true; };
  }, [project.id]);

  // Load workspace members (used as project team pool)
  useEffect(() => {
    if (!workspaceId) {
      setMembersLoading(false);
      setMembers([]);
      return;
    }
    let cancelled = false;
    setMembersLoading(true);
    listWorkspaceMembers(workspaceId)
      .then((rows) => {
        if (!cancelled) setMembers(rows || []);
      })
      .catch(() => {
        if (!cancelled) setMembers([]);
      })
      .finally(() => {
        if (!cancelled) setMembersLoading(false);
      });
    return () => { cancelled = true; };
  }, [workspaceId]);

  // Load project-linked documents
  useEffect(() => {
    if (!workspaceId) {
      setDocsLoading(false);
      setDocs([]);
      return;
    }
    let cancelled = false;
    setDocsLoading(true);
    api
      .get(`/work/workspaces/${workspaceId}/projects/${project.id}/documents`)
      .then((res: any) => {
        if (cancelled) return;
        const data = res?.data ?? res;
        const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        setDocs(
          items.map((d: any) => ({
            id: d.id,
            title: d.title,
            updatedAt: d.updatedAt,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setDocs([]);
      })
      .finally(() => {
        if (!cancelled) setDocsLoading(false);
      });
    return () => { cancelled = true; };
  }, [workspaceId, project.id]);

  // Phase 3: Load per-project team
  useEffect(() => {
    let cancelled = false;
    setTeamLoading(true);
    projectsApi
      .getProjectTeam(project.id)
      .then((res) => {
        if (!cancelled) setTeamMemberIds(res.teamMemberIds || []);
      })
      .catch(() => {
        if (!cancelled) setTeamMemberIds([]);
      })
      .finally(() => {
        if (!cancelled) setTeamLoading(false);
      });
    return () => { cancelled = true; };
  }, [project.id]);

  // Phase 3: Add a workspace member to the project team
  const handleAddTeamMember = async (userId: string) => {
    if (teamMemberIds.includes(userId)) return;
    setTeamMutating(true);
    const next = [...teamMemberIds, userId];
    try {
      const res = await projectsApi.updateProjectTeam(project.id, next);
      setTeamMemberIds(res.teamMemberIds);
      setShowAddPicker(false);
      // Invalidate project query so Activities re-reads team
      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
      queryClient.invalidateQueries({ queryKey: ['project-team', project.id] });
      toast.success('Team member added');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to add team member');
    } finally {
      setTeamMutating(false);
    }
  };

  // Phase 3: Remove a workspace member from the project team (PM cannot be removed)
  const handleRemoveTeamMember = async (userId: string) => {
    if (deliveryOwnerUserId && userId === deliveryOwnerUserId) {
      toast.error('Project Manager cannot be removed from team');
      return;
    }
    setTeamMutating(true);
    const next = teamMemberIds.filter((id) => id !== userId);
    try {
      const res = await projectsApi.updateProjectTeam(project.id, next);
      setTeamMemberIds(res.teamMemberIds);
      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
      queryClient.invalidateQueries({ queryKey: ['project-team', project.id] });
      toast.success('Team member removed');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to remove team member');
    } finally {
      setTeamMutating(false);
    }
  };

  // Filter workspace members to only those on the project team
  const projectTeamMembers = useMemo(() => {
    if (!members) return [];
    return members.filter((m) => {
      const id = m.userId || m.user?.id;
      return id && teamMemberIds.includes(id);
    });
  }, [members, teamMemberIds]);

  // Workspace members NOT yet on the project team (for the add picker)
  const availableMembers = useMemo(() => {
    if (!members) return [];
    return members.filter((m) => {
      const id = m.userId || m.user?.id;
      return id && !teamMemberIds.includes(id);
    });
  }, [members, teamMemberIds]);

  // Resolve project manager from members list using deliveryOwnerUserId
  const projectManager = deliveryOwnerUserId
    ? members?.find((m) => m.userId === deliveryOwnerUserId || m.user?.id === deliveryOwnerUserId)
    : null;

  const memberName = (m: WorkspaceMember): string => {
    if (m.name) return m.name;
    if (m.user?.firstName || m.user?.lastName) {
      return `${m.user.firstName ?? ""} ${m.user.lastName ?? ""}`.trim();
    }
    return m.user?.email || m.email || "Unknown";
  };

  return (
    <div
      className="rounded-xl border border-slate-200 bg-white shadow-sm"
      data-testid="project-template-essentials-card"
    >
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="text-base font-semibold text-slate-900">Template &amp; plan essentials</h2>
        <p className="mt-1 text-xs text-slate-500">
          Phases, linked documents, and project team — aligned with what you saw in template preview.
        </p>
        {(projectState !== undefined || structureLocked !== undefined) && (
          <p className="mt-2 text-xs text-slate-600">
            {projectState !== undefined && (
              <span className="mr-3">
                <span className="font-medium text-slate-700">Delivery state:</span> {projectState}
              </span>
            )}
            {structureLocked !== undefined && (
              <span>
                <span className="font-medium text-slate-700">Structure:</span>{' '}
                {structureLocked ? 'Locked' : 'Editable'}
              </span>
            )}
          </p>
        )}
      </div>

      {/* Phase summary */}
      <div className="border-t border-slate-100 px-6 py-5">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-slate-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Phases
          </h3>
        </div>
        <div className="mt-3">
          {phasesLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          ) : !phases || phases.length === 0 ? (
            <p className="text-sm text-slate-400">No phases defined yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {phases.map((phase) => (
                <span
                  key={phase.id}
                  className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                >
                  {phase.name}
                  {phase.isMilestone && <span className="ml-1.5 text-amber-600">★</span>}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Linked documents */}
      <div className="border-t border-slate-100 px-6 py-5">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Linked Documents
          </h3>
        </div>
        <div className="mt-3">
          {docsLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          ) : !docs || docs.length === 0 ? (
            <p className="text-sm text-slate-400">No documents linked yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {docs.slice(0, 5).map((doc) => (
                <li key={doc.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <FileText className="h-3.5 w-3.5 text-slate-400" />
                  {doc.title}
                </li>
              ))}
              {docs.length > 5 && (
                <li className="text-xs text-slate-400">+{docs.length - 5} more</li>
              )}
            </ul>
          )}
        </div>
      </div>

      {/* Team members section — Phase 3: editable per-project team */}
      <div
        id="project-team-section"
        className="border-t border-slate-100 px-6 py-5 scroll-mt-24"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Team Members
            </h3>
          </div>
          {canEdit && availableMembers.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAddPicker((v) => !v)}
              disabled={teamMutating}
              className="flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
            >
              <Plus className="h-3 w-3" />
              Add member
            </button>
          )}
        </div>

        {teamLoading || membersLoading ? (
          <div className="mt-3">
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          </div>
        ) : projectTeamMembers.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">
            {canEdit
              ? "No team members assigned yet. Click \"Add member\" to add workspace members to this project."
              : "No team members assigned yet."}
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {projectTeamMembers.map((m) => {
              const id = m.userId || m.user?.id || "";
              const isPm = id === deliveryOwnerUserId;
              return (
                <span
                  key={m.id}
                  className={`group flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                    isPm
                      ? "bg-blue-100 text-blue-800"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {memberName(m)}
                  {isPm && <span className="text-[10px] uppercase tracking-wider text-blue-600">PM</span>}
                  {canEdit && !isPm && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTeamMember(id)}
                      disabled={teamMutating}
                      className="opacity-0 transition group-hover:opacity-100 hover:text-red-600 disabled:opacity-50"
                      aria-label={`Remove ${memberName(m)}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              );
            })}
          </div>
        )}

        {/* Add picker — workspace members not yet on project team */}
        {showAddPicker && canEdit && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 text-xs font-medium text-slate-600">
              Add workspace member to project
            </div>
            {availableMembers.length === 0 ? (
              <p className="text-xs text-slate-400">
                All workspace members are already on this project.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {availableMembers.slice(0, 12).map((m) => {
                  const id = m.userId || m.user?.id || "";
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleAddTeamMember(id)}
                      disabled={teamMutating || !id}
                      className="rounded-full bg-white border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50"
                    >
                      + {memberName(m)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
