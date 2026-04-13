/**
 * ProjectOverviewCards — Overview tab content cards.
 *
 * 1. Project Team (full width)
 * 2. To Do + Immediate Actions (side by side)
 * 3. Documents (full width, bottom)
 */
import React, { type ReactNode, useEffect, useMemo, useState, useCallback } from 'react';
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
import { projectsApi, projectShowsGovernanceIndicator, type ProjectDetail } from '../projects.api';
// listTasks/updateTask will be used when To Do gets backend persistence
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

/* ── To Do Category Colors ─────────────────────────────────── */

const TODO_CATEGORIES = [
  { id: 'action', label: 'Action', color: '#6366f1' },
  { id: 'review', label: 'Review', color: '#3b82f6' },
  { id: 'followup', label: 'Follow-up', color: '#f59e0b' },
  { id: 'blocker', label: 'Blocker', color: '#ef4444' },
] as const;

type TodoCategory = typeof TODO_CATEGORIES[number]['id'];

interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  category: TodoCategory;
  author: string;
}

let todoCounter = 0;

/* ── ToDoCard ──────────────────────────────────────────────── */

function ToDoCard({ canEdit, userName }: { canEdit: boolean; userName: string }) {
  const [items, setItems] = useState<TodoItem[]>([]);
  const [draft, setDraft] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TodoCategory>('action');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const addItem = () => {
    const text = draft.trim();
    if (!text) return;
    setItems((prev) => [
      ...prev,
      { id: `todo-${++todoCounter}`, text, done: false, category: selectedCategory, author: userName },
    ]);
    setDraft('');
    inputRef.current?.focus();
  };

  const toggleItem = (id: string) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, done: !it.done } : it)));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const catColor = (cat: TodoCategory) => TODO_CATEGORIES.find((c) => c.id === cat)?.color ?? '#6366f1';

  return (
    <div
      className="rounded-xl bg-white overflow-hidden flex flex-col"
      style={{ border: '0.5px solid #e2e8f0', borderTop: '3px solid #6366f1' }}
    >
      <div className="flex items-center justify-between px-5 py-3.5">
        <h3 style={{ fontSize: 15, fontWeight: 500, color: '#1e293b' }}>To Do</h3>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>
          {items.filter((i) => !i.done).length} remaining
        </span>
      </div>

      <div className="px-5 pb-4 flex-1">
        {/* Add input */}
        {canEdit && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 flex items-center rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
              {/* Category selector */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as TodoCategory)}
                className="bg-transparent border-none text-xs font-medium px-2.5 py-2.5 outline-none"
                style={{ color: catColor(selectedCategory), width: 90 }}
              >
                {TODO_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
              <input
                ref={inputRef}
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addItem(); }}
                placeholder="Add a to-do item..."
                className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700 py-2.5 pr-2"
              />
            </div>
            <button
              type="button"
              onClick={addItem}
              disabled={!draft.trim()}
              className="shrink-0 flex items-center justify-center rounded-xl disabled:opacity-30 transition-opacity"
              style={{ width: 36, height: 36, background: '#6366f1' }}
            >
              <span className="text-white text-lg font-light leading-none">+</span>
            </button>
          </div>
        )}

        {/* Items */}
        {items.length === 0 ? (
          <div className="flex items-center gap-3 py-6 justify-center">
            <div className="flex items-center justify-center" style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #C0DD97, #97C459)' }}>
              <CheckCircle style={{ width: 16, height: 16, color: 'white' }} />
            </div>
            <p style={{ fontSize: 13, color: '#64748b' }}>No to-do items yet. Add one above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const color = catColor(item.category);
              const catLabel = TODO_CATEGORIES.find((c) => c.id === item.category)?.label ?? '';
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-xl p-3 transition-colors group"
                  style={{
                    borderLeft: `3px solid ${color}`,
                    background: item.done ? '#f8fafc' : `${color}08`,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => toggleItem(item.id)}
                    className="shrink-0 mt-0.5 transition-colors"
                    title={item.done ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {item.done ? (
                      <div className="flex items-center justify-center" style={{ width: 20, height: 20, borderRadius: '50%', background: color }}>
                        <CheckCircle style={{ width: 14, height: 14, color: 'white' }} />
                      </div>
                    ) : (
                      <Circle style={{ width: 20, height: 20, color: '#cbd5e1' }} />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p style={{ fontSize: 11, fontWeight: 600, color, textTransform: 'capitalize' }}>{catLabel}</p>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: item.done ? '#94a3b8' : '#1e293b',
                        textDecoration: item.done ? 'line-through' : 'none',
                      }}
                    >
                      {item.text}
                    </p>
                    <p style={{ fontSize: 11, color: '#94a3b8' }}>{item.author}</p>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="shrink-0 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all"
                      title="Remove"
                    >
                      <span style={{ fontSize: 16, lineHeight: 1 }}>&times;</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
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
      {projectShowsGovernanceIndicator(project) && (
        <div
          className="flex items-start gap-3 rounded-lg border border-purple-200/90 bg-purple-50/80 px-4 py-3"
          title="This project inherits governance policies from its template. Some changes may require an admin-approved exception."
        >
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-purple-600" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-medium text-purple-900">Governance</p>
            <p className="text-xs leading-relaxed text-purple-800/90">
              Template policies may apply to this project. The header and Activities toolbar show when governance is
              active; if a change is blocked, you can request an exception for org admin review.
            </p>
          </div>
        </div>
      )}
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
        {/* Left: To Do — manual checklist managed by PM */}
        <ToDoCard canEdit={canEdit} userName={user?.firstName || user?.email?.split('@')[0] || 'You'} />

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
