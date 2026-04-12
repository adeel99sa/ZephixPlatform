/**
 * ProjectOverviewCards — Overview tab content cards.
 *
 * 1. Project Team (full width)
 * 2. To Do + Immediate Actions (side by side)
 * 3. Documents (full width, bottom)
 */
import { type ReactNode, useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Circle,
  FileText,
  FolderPlus,
  Link2,
  Loader2,
  Settings,
  Shield,
  Upload,
  UserPlus,
  Users,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/state/AuthContext';
import { listWorkspaceMembers, type WorkspaceMember } from '@/features/workspaces/workspace.api';
import { projectsApi, type ProjectDetail } from '../projects.api';
import {
  listTasks,
  updateTask,
  type WorkTask,
} from '@/features/work-management/workTasks.api';
import {
  overviewActionItemKey,
  type NeedsAttentionItem,
  type ProjectOverview,
} from '../model/projectOverview';
import { GradientAvatar } from '@/components/ui/GradientAvatar';

/* ── Types ──────────────────────────────────────────────────── */

interface ProjectDoc {
  id: string;
  title: string;
  updatedAt?: string;
}

interface ProjectOverviewCardsProps {
  project: ProjectDetail;
  workspaceId: string;
  overview: ProjectOverview | null;
  canEdit: boolean;
}

/* ── Helpers ────────────────────────────────────────────────── */

function memberName(m: WorkspaceMember): string {
  if (m.name) return m.name;
  if (m.user?.firstName || m.user?.lastName)
    return `${m.user.firstName ?? ''} ${m.user.lastName ?? ''}`.trim();
  return m.user?.email || m.email || 'Unknown';
}

const DOC_ICON_GRADIENTS: [string, string][] = [
  ['#FAC775', '#EF9F27'],
  ['#85B7EB', '#378ADD'],
  ['#AFA9EC', '#7F77DD'],
];

const DOC_HOVER_TINTS = ['#FAEEDA', '#E6F1FB', '#EEEDFE'];

function DocRow({ hoverTint, children }: { hoverTint: string; children: ReactNode }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors"
      style={{ background: hovered ? hoverTint : undefined }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </div>
  );
}

function isThisWeek(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  return d >= startOfWeek && d < endOfWeek;
}

function formatShortDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch { return ''; }
}

/* ── Component ──────────────────────────────────────────────── */

export function ProjectOverviewCards({
  project,
  workspaceId,
  overview,
  canEdit,
}: ProjectOverviewCardsProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Team state
  const [teamMembers, setTeamMembers] = useState<WorkspaceMember[]>([]);
  const [pmMember, setPmMember] = useState<WorkspaceMember | null>(null);
  const [teamLoading, setTeamLoading] = useState(true);

  // Docs state
  const [docs, setDocs] = useState<ProjectDoc[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);

  // To Do state (tasks assigned to current user)
  const [myTasks, setMyTasks] = useState<WorkTask[]>([]);
  const [myTasksLoading, setMyTasksLoading] = useState(true);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  // Fetch team + workspace members
  useEffect(() => {
    if (!project.id || !workspaceId) return;
    let cancelled = false;
    setTeamLoading(true);

    Promise.allSettled([
      projectsApi.getProjectTeam(project.id),
      listWorkspaceMembers(workspaceId),
    ]).then(([teamResult, membersResult]) => {
      if (cancelled) return;
      if (teamResult.status === 'fulfilled' && membersResult.status === 'fulfilled') {
        const teamIds = new Set(teamResult.value.teamMemberIds || []);
        const pmId = overview?.deliveryOwnerUserId ?? teamResult.value.projectManagerId ?? null;
        const allMembers = membersResult.value || [];
        setPmMember(pmId ? allMembers.find((m) => m.userId === pmId || m.user?.id === pmId) ?? null : null);
        setTeamMembers(allMembers.filter((m) => teamIds.has(m.userId || '') || teamIds.has(m.user?.id || '')));
      }
      setTeamLoading(false);
    });
    return () => { cancelled = true; };
  }, [project.id, workspaceId, overview?.deliveryOwnerUserId]);

  const nonPmMembers = useMemo(() => {
    const pmId = pmMember?.userId || pmMember?.user?.id;
    if (!pmId) return teamMembers;
    return teamMembers.filter((m) => (m.userId || m.user?.id) !== pmId);
  }, [teamMembers, pmMember]);

  // Fetch documents
  useEffect(() => {
    if (!project.id || !workspaceId) return;
    let cancelled = false;
    setDocsLoading(true);
    api.get(`/work/workspaces/${workspaceId}/projects/${project.id}/documents`)
      .then((res: any) => {
        if (cancelled) return;
        const data = res?.data ?? res;
        const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        setDocs(items.map((d: any) => ({ id: d.id, title: d.title, updatedAt: d.updatedAt })));
      })
      .catch(() => { if (!cancelled) setDocs([]); })
      .finally(() => { if (!cancelled) setDocsLoading(false); });
    return () => { cancelled = true; };
  }, [project.id, workspaceId]);

  // Fetch tasks assigned to current user
  useEffect(() => {
    if (!project.id || !user?.id) return;
    let cancelled = false;
    setMyTasksLoading(true);
    listTasks({ projectId: project.id, assigneeUserId: user.id, limit: 10, sortBy: 'dueDate', sortDir: 'asc' })
      .then((result) => {
        if (!cancelled) setMyTasks((result.tasks || []).filter((t) => t.status !== 'DONE' && t.status !== 'CANCELED'));
      })
      .catch(() => { if (!cancelled) setMyTasks([]); })
      .finally(() => { if (!cancelled) setMyTasksLoading(false); });
    return () => { cancelled = true; };
  }, [project.id, user?.id]);

  // Mark task as done
  const handleCompleteTask = useCallback(async (taskId: string) => {
    setCompletingTaskId(taskId);
    try {
      await updateTask(taskId, { status: 'DONE' as any });
      setMyTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch { /* silently fail — task stays in list */ }
    finally { setCompletingTaskId(null); }
  }, []);

  // Immediate actions — filter to due this week
  const immediateItems = useMemo(() => {
    if (!overview) return [];
    const seen = new Set<string>();
    const out: NeedsAttentionItem[] = [];
    for (const item of [...overview.needsAttention, ...overview.nextActions]) {
      const key = overviewActionItemKey(item);
      if (!seen.has(key)) { seen.add(key); out.push(item); }
    }
    return out.slice(0, 5);
  }, [overview]);

  const attentionKeys = useMemo(() => {
    if (!overview) return new Set<string>();
    return new Set(overview.needsAttention.map(overviewActionItemKey));
  }, [overview]);

  return (
    <div className="space-y-4">
      {/* ── Project Team (full width) ── */}
      <div
        className="rounded-xl bg-white overflow-hidden"
        style={{ border: '0.5px solid #e2e8f0', borderTop: '3px solid #1D9E75' }}
      >
        <div className="flex items-center justify-between px-5 py-3.5">
          <h3 style={{ fontSize: 15, fontWeight: 500, color: '#1e293b' }}>Project team</h3>
          {canEdit && (
            <button
              type="button"
              className="flex items-center gap-1 rounded-lg px-2.5 py-1"
              style={{ fontSize: 12, color: '#0F6E56', background: '#E1F5EE' }}
            >
              <Settings style={{ width: 12, height: 12 }} />
              Manage
            </button>
          )}
        </div>

        <div className="space-y-2 px-5 pb-4">
          {teamLoading ? (
            <p className="text-xs text-slate-400 py-4 text-center">Loading team...</p>
          ) : (
            <>
              {/* Project Lead */}
              <div
                className="flex items-center gap-3 rounded-xl p-3"
                style={{
                  background: pmMember ? 'linear-gradient(135deg, #E6F1FB, #EEEDFE)' : undefined,
                  border: pmMember ? 'none' : '0.5px solid #e2e8f0',
                }}
              >
                <div className="flex items-center justify-center" style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #1D9E75, #5DCAA5)' }}>
                  <Users style={{ width: 18, height: 18, color: 'white' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#1e293b' }}>Project Lead</p>
                  <p style={{ fontSize: 11, color: '#64748b' }}>{pmMember ? memberName(pmMember) : 'Not assigned'}</p>
                </div>
                {pmMember ? (
                  <GradientAvatar name={memberName(pmMember)} size={20} />
                ) : canEdit ? (
                  <button type="button" className="flex items-center gap-1 rounded-lg px-2 py-1" style={{ fontSize: 11, color: '#0F6E56', background: '#E1F5EE' }}>+ Assign</button>
                ) : null}
              </div>

              {/* Business Lead */}
              <div className="flex items-center gap-3 rounded-xl p-3" style={{ border: '0.5px solid #e2e8f0' }}>
                <div className="flex items-center justify-center" style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #378ADD, #7F77DD)' }}>
                  <Shield style={{ width: 18, height: 18, color: 'white' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#1e293b' }}>Business Lead</p>
                  <p style={{ fontSize: 11, color: '#94a3b8' }}>Not assigned</p>
                </div>
                {canEdit && (
                  <button type="button" className="flex items-center gap-1 rounded-lg px-2 py-1" style={{ fontSize: 11, color: '#0F6E56', background: '#E1F5EE' }}>+ Assign</button>
                )}
              </div>

              {/* Team members */}
              <div className="flex items-center gap-3 rounded-xl p-3" style={{ border: '0.5px solid #e2e8f0' }}>
                <div className="flex items-center justify-center" style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #EF9F27, #D85A30)' }}>
                  <UserPlus style={{ width: 18, height: 18, color: 'white' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#1e293b' }}>Team</p>
                  {nonPmMembers.length > 0 ? (
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex">
                        {nonPmMembers.slice(0, 4).map((m, i) => (
                          <GradientAvatar
                            key={m.userId || m.user?.id || i}
                            name={memberName(m)}
                            size={26}
                            style={{ border: '2px solid white', marginRight: i < Math.min(nonPmMembers.length, 4) - 1 ? -8 : 0 }}
                          />
                        ))}
                        {nonPmMembers.length > 4 && (
                          <div className="flex items-center justify-center" style={{ width: 26, height: 26, borderRadius: '50%', background: '#f1f5f9', border: '2px solid white', fontSize: 10, fontWeight: 500, color: '#64748b', marginLeft: -8 }}>
                            +{nonPmMembers.length - 4}
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: 11, color: '#64748b' }}>{nonPmMembers.length} {nonPmMembers.length === 1 ? 'person' : 'people'}</span>
                      <span style={{ fontSize: 11, color: '#0F6E56', cursor: 'pointer' }}>View all</span>
                    </div>
                  ) : (
                    <p style={{ fontSize: 11, color: '#94a3b8' }}>No team members yet</p>
                  )}
                </div>
                {canEdit && (
                  <button type="button" className="flex items-center gap-1 rounded-lg px-2 py-1" style={{ fontSize: 11, color: '#854F0B', background: '#FAEEDA' }}>+ Add</button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── To Do + Immediate Actions (side by side) ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Left: To Do */}
        <div
          className="rounded-xl bg-white overflow-hidden"
          style={{ border: '0.5px solid #e2e8f0', borderTop: '3px solid #6366f1' }}
        >
          <div className="flex items-center justify-between px-5 py-3.5">
            <h3 style={{ fontSize: 15, fontWeight: 500, color: '#1e293b' }}>To Do</h3>
            <button
              type="button"
              onClick={() => navigate(`/projects/${project.id}/tasks`)}
              className="flex items-center gap-1"
              style={{ fontSize: 12, color: '#4f46e5' }}
            >
              All tasks
              <ArrowRight style={{ width: 12, height: 12 }} />
            </button>
          </div>

          <div className="px-5 pb-4">
            {myTasksLoading ? (
              <div className="flex items-center justify-center py-6 gap-2 text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span style={{ fontSize: 13 }}>Loading...</span>
              </div>
            ) : myTasks.length === 0 ? (
              <div className="flex items-center gap-3 py-6 justify-center">
                <div className="flex items-center justify-center" style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #C0DD97, #97C459)' }}>
                  <CheckCircle style={{ width: 16, height: 16, color: 'white' }} />
                </div>
                <p style={{ fontSize: 13, color: '#64748b' }}>All caught up! No tasks assigned to you.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {myTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 rounded-lg p-2.5 hover:bg-slate-50 transition-colors group"
                  >
                    <button
                      type="button"
                      onClick={() => handleCompleteTask(task.id)}
                      disabled={completingTaskId === task.id}
                      className="shrink-0 mt-0.5 text-slate-300 hover:text-green-500 transition-colors disabled:opacity-50"
                      title="Mark as done"
                    >
                      {completingTaskId === task.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-green-500" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#1e293b' }} className="truncate">
                        {task.title}
                      </p>
                      {task.dueDate && (
                        <p style={{ fontSize: 11, color: isThisWeek(task.dueDate) ? '#b45309' : '#94a3b8' }}>
                          Due {formatShortDate(task.dueDate)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {myTasks.length > 5 && (
                  <p className="text-center pt-1" style={{ fontSize: 11, color: '#94a3b8' }}>
                    +{myTasks.length - 5} more in Activities
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Immediate Actions */}
        <div
          className="rounded-xl bg-white overflow-hidden"
          style={{ border: '0.5px solid #e2e8f0', borderTop: '3px solid #378ADD' }}
        >
          <div className="flex items-center justify-between px-5 py-3.5">
            <h3 style={{ fontSize: 15, fontWeight: 500, color: '#1e293b' }}>Immediate actions</h3>
            <button
              type="button"
              onClick={() => navigate(`/projects/${project.id}/tasks`)}
              className="flex items-center gap-1"
              style={{ fontSize: 12, color: '#185FA5' }}
            >
              View all
              <ArrowRight style={{ width: 12, height: 12 }} />
            </button>
          </div>

          <div className="px-5 pb-4">
            {immediateItems.length === 0 ? (
              <div className="flex items-center gap-3 py-6 justify-center">
                <div className="flex items-center justify-center" style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #C0DD97, #97C459)' }}>
                  <CheckCircle style={{ width: 16, height: 16, color: 'white' }} />
                </div>
                <p style={{ fontSize: 13, color: '#64748b' }}>All caught up! No immediate actions.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {immediateItems.map((item, idx) => {
                  const isUrgent = attentionKeys.has(overviewActionItemKey(item));
                  return (
                    <div
                      key={item.entityRef?.taskId ?? idx}
                      className="flex items-start gap-3 rounded-lg p-3"
                      style={{ background: isUrgent ? '#FAEEDA' : '#f8fafc' }}
                    >
                      <div
                        className="flex items-center justify-center shrink-0 mt-0.5"
                        style={{
                          width: 30, height: 30, borderRadius: '50%',
                          background: isUrgent
                            ? 'linear-gradient(135deg, #EF9F27, #D85A30)'
                            : 'linear-gradient(135deg, #85B7EB, #378ADD)',
                        }}
                      >
                        {isUrgent ? (
                          <AlertTriangle style={{ width: 14, height: 14, color: 'white' }} />
                        ) : (
                          <ArrowRight style={{ width: 14, height: 14, color: 'white' }} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p style={{ fontSize: 13, fontWeight: 500, color: '#1e293b' }}>{item.reasonText}</p>
                        <p style={{ fontSize: 11, color: '#64748b' }} className="mt-0.5">
                          {item.nextStepLabel}
                          {item.dueDate && <> &middot; Due {formatShortDate(item.dueDate)}</>}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Documents (full width, bottom) ── */}
      <div
        className="rounded-xl bg-white overflow-hidden"
        style={{ border: '0.5px solid #e2e8f0', borderTop: '3px solid #534AB7' }}
      >
        <div className="flex items-center justify-between px-5 py-3.5">
          <h3 style={{ fontSize: 15, fontWeight: 500, color: '#1e293b' }}>Documents</h3>
          {canEdit && (
            <div className="flex items-center gap-1.5">
              {[
                { icon: FolderPlus, label: 'New folder' },
                { icon: Upload, label: 'Upload' },
                { icon: Link2, label: 'Link' },
              ].map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  type="button"
                  className="flex items-center justify-center"
                  style={{ width: 30, height: 30, borderRadius: 8, background: '#EEEDFE' }}
                  title={label}
                >
                  <Icon style={{ width: 14, height: 14, color: '#534AB7' }} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 pb-4">
          {docsLoading ? (
            <p className="text-xs text-slate-400 py-4 text-center">Loading documents...</p>
          ) : docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 rounded-xl" style={{ background: '#fafafa', border: '1px dashed #e2e8f0' }}>
              <FileText style={{ width: 32, height: 32, color: '#cbd5e1' }} />
              <p style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>No documents linked yet</p>
              <p style={{ fontSize: 12, color: '#94a3b8' }}>Upload files or add links to get started</p>
            </div>
          ) : (
            <div className="space-y-1">
              {docs.slice(0, 5).map((doc, i) => {
                const [g1, g2] = DOC_ICON_GRADIENTS[i % DOC_ICON_GRADIENTS.length];
                const hoverTint = DOC_HOVER_TINTS[i % DOC_HOVER_TINTS.length];
                return (
                  <DocRow key={doc.id} hoverTint={hoverTint}>
                    <div className="flex items-center justify-center shrink-0" style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${g1}, ${g2})` }}>
                      <FileText style={{ width: 16, height: 16, color: 'white' }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#1e293b' }} className="truncate">{doc.title}</p>
                      {doc.updatedAt && (
                        <p style={{ fontSize: 11, color: '#94a3b8' }}>Updated {formatShortDate(doc.updatedAt)}</p>
                      )}
                    </div>
                  </DocRow>
                );
              })}
              {docs.length > 5 && (
                <div className="flex items-center justify-center py-2 mt-1" style={{ borderBottom: '0.5px dashed #cbd5e1' }}>
                  <span style={{ fontSize: 12, color: '#185FA5', cursor: 'pointer' }}>View all documents</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
