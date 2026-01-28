/**
 * PROMPT 5: Workspace Home Page with Modern Shell
 *
 * Layout from top to bottom:
 * 1. Header block - workspace name, owner name, action buttons (Owner only)
 * 2. Start work section - CTA for owner/member, read-only message for guest
 * 3. Workspace notes section - editable by owner, read-only for others
 * 4. Projects snapshot - up to 5 projects (name, status, health label)
 * 5. Members snapshot - up to 5 members with total count
 */
/**
 * PHASE 6 MODULE 2: Workspace Home with Dashboard Widgets
 *
 * Enhanced with:
 * - Widget cards for metrics (active projects, standalone vs linked, work items, risks, conflicts)
 * - Uses workspace home endpoint data
 * - Computes metrics from projects array
 * - Clickable numbers filter projects list
 */
import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useAuth } from '@/state/AuthContext';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { useWorkspacePermissions } from '@/hooks/useWorkspacePermissions';
import { getWorkspace, updateWorkspace, listProjects, listWorkspaceMembers } from '@/features/workspaces/workspace.api';
import { ProjectCreateModal } from '@/features/projects/ProjectCreateModal';
import { WorkspaceMemberInviteModal } from '@/features/workspaces/components/WorkspaceMemberInviteModal';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';
import { mapRoleToAccessLevel } from '@/utils/workspace-access-levels';
import { addWorkspaceMember } from '@/features/workspaces/workspace.api';
import { toast } from 'sonner';
import { mapAccessLevelToRole } from '@/utils/workspace-access-levels';
import { api } from '@/lib/api';
import { useWorkspaceVisitTracker } from '@/hooks/useWorkspaceVisitTracker';

type Workspace = {
  id: string;
  name: string;
  description?: string;
  ownerId?: string;
  owner?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    name?: string;
  };
  homeNotes?: string;
};

type Project = {
  id: string;
  name: string;
  status?: string;
  health?: string;
  programId?: string | null;
  portfolioId?: string | null;
  program?: { id: string; name: string } | null;
  portfolio?: { id: string; name: string } | null;
  deliveryOwner?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    name?: string;
  };
  deliveryOwnerUserId?: string;
};

type ExecutionSummary = {
  version: number;
  counts: {
    activeProjects: number;
    totalWorkItems: number;
    overdueWorkItems: number;
    dueSoon7Days: number;
    inProgress: number;
    doneLast7Days: number;
  };
  topOverdue: Array<{
    id: string;
    title: string;
    dueDate: string | null;
    projectId: string;
    projectName: string;
    assigneeId: string | null;
    assigneeName: string | null;
  }>;
  recentActivity: Array<{
    type: string;
    createdAt: string;
    actorUserId: string;
    actorName: string;
    workItemId: string;
    workItemTitle: string;
    projectId: string;
    projectName: string;
  }>;
};

type WorkspaceHomeData = {
  workspace: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    owner: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string;
    } | null;
  };
  stats: {
    activeProjectsCount: number;
    membersCount: number;
  };
  lists: {
    activeProjects: Array<{
      id: string;
      name: string;
      status: string;
    }>;
  };
  topRisksCount: number;
  executionSummary?: ExecutionSummary; // PHASE 7 MODULE 7.3: Execution signals
};

type Member = {
  id: string;
  userId?: string;
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    name?: string;
  };
  email?: string;
  name?: string;
  role?: string;
};

export default function WorkspaceHome() {
  const workspaceId = useWorkspaceStore(s => s.activeWorkspaceId);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { workspaceRole } = useWorkspaceRole(workspaceId);
  const permissions = useWorkspacePermissions();

  const { slug } = useParams<{ slug: string }>();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaceHomeData, setWorkspaceHomeData] = useState<WorkspaceHomeData | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]); // Full list for metrics
  const [members, setMembers] = useState<Member[]>([]);
  const [totalMemberCount, setTotalMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [projectFilter, setProjectFilter] = useState<'all' | 'standalone' | 'linked' | null>(null);
  const newMenuRef = useRef<HTMLDivElement>(null);
  const newButtonRef = useRef<HTMLButtonElement>(null);

  // Close "New" menu when clicking outside
  useEffect(() => {
    if (!showNewMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        newMenuRef.current &&
        !newMenuRef.current.contains(event.target as Node) &&
        newButtonRef.current &&
        !newButtonRef.current.contains(event.target as Node)
      ) {
        setShowNewMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNewMenu]);

  useEffect(() => {
    if (authLoading || !user) {
      setLoading(false);
      return;
    }

    loadWorkspaceData();
  }, [authLoading, user, workspaceId, slug]);

  // Track workspace visits for /home page
  useWorkspaceVisitTracker({
    workspaceId: workspace?.id,
    workspaceName: workspace?.name,
  });

  /**
   * Resolve workspace ID from slug if slug is provided
   * Returns the resolved workspace ID or null if not found
   */
  async function resolveWorkspaceIdFromSlug(slug: string): Promise<string | null> {
    try {
      const response = await api.get<{ id: string; slug: string; name: string }>(`/workspaces/slug/${slug}`);
      return response?.id || null;
    } catch (error) {
      console.error('Failed to resolve workspace from slug:', error);
      return null;
    }
  }

  async function loadWorkspaceData() {
    setLoading(true);
    try {
      let effectiveWorkspaceId = workspaceId;

      // Step 1: If slug exists, resolve slug to id first
      if (slug) {
        const resolvedId = await resolveWorkspaceIdFromSlug(slug);
        if (resolvedId) {
          effectiveWorkspaceId = resolvedId;
          // Step 2: If resolved id differs from store, update store
          if (resolvedId !== workspaceId) {
            useWorkspaceStore.getState().setActiveWorkspace(resolvedId);
          }
        } else {
          // Slug resolution failed - cannot proceed
          setWorkspace(null);
          return;
        }
      }

      // Step 3: If no effective workspace ID, cannot proceed
      if (!effectiveWorkspaceId) {
        setWorkspace(null);
        return;
      }

      // Step 4: Use effectiveWorkspaceId for all subsequent calls
      // PHASE 6 MODULE 2: Use workspace home endpoint if slug available
      let homeData: WorkspaceHomeData | null = null;
      if (slug) {
        try {
          const response = await api.get<{ data: WorkspaceHomeData }>(`/workspaces/slug/${slug}/home`);
          homeData = response.data;
          setWorkspaceHomeData(homeData);
          if (homeData?.workspace) {
            const ws: Workspace = {
              id: homeData.workspace.id,
              name: homeData.workspace.name,
              description: homeData.workspace.description || undefined,
              owner: homeData.workspace.owner ? {
                id: homeData.workspace.owner.id,
                firstName: homeData.workspace.owner.firstName || undefined,
                lastName: homeData.workspace.owner.lastName || undefined,
                email: homeData.workspace.owner.email,
              } : undefined,
            };
            setWorkspace(ws);
            // Get workspace notes separately using effectiveWorkspaceId
            const wsDetail = await getWorkspace(effectiveWorkspaceId).catch(() => null);
            if (wsDetail?.homeNotes) {
              setNotesValue(wsDetail.homeNotes);
            }
          }
        } catch (error) {
          console.warn('Failed to load workspace home endpoint, falling back to individual calls:', error);
        }
      }

      // Always fetch full project list for metrics (includes programId/portfolioId)
      // Use effectiveWorkspaceId for all calls
      const [ws, projs, mems] = await Promise.all([
        !homeData ? getWorkspace(effectiveWorkspaceId).catch(() => null) : Promise.resolve(null),
        listProjects(effectiveWorkspaceId).catch(() => []),
        listWorkspaceMembers(effectiveWorkspaceId).catch(() => []),
      ]);

      if (!homeData && ws) {
        setWorkspace(ws);
        setNotesValue(ws.homeNotes || '');
      }

      // Store full project list for metrics
      setAllProjects(projs);

      // Apply filter if set
      let filteredProjects = projs;
      if (projectFilter === 'standalone') {
        filteredProjects = projs.filter(p => !p.programId && !p.portfolioId);
      } else if (projectFilter === 'linked') {
        filteredProjects = projs.filter(p => p.programId || p.portfolioId);
      }

      setProjects(filteredProjects.slice(0, 50)); // Show up to 50 projects
      setMembers(mems.slice(0, 5)); // Max 5 for snapshot
      setTotalMemberCount(mems.length);
    } catch (error) {
      console.error('Failed to load workspace data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveNotes() {
    if (!workspaceId || !workspace) return;

    setSavingNotes(true);
    try {
      const updated = await updateWorkspace(workspaceId, { homeNotes: notesValue });
      setWorkspace(updated);
      setEditingNotes(false);
    } catch (error) {
      console.error('Failed to save notes:', error);
      alert('Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  }

  function getOwnerName(owner?: Workspace['owner']): string {
    if (!owner) return 'Unknown';
    if (owner.name) return owner.name;
    if (owner.firstName || owner.lastName) {
      return [owner.firstName, owner.lastName].filter(Boolean).join(' ');
    }
    return owner.email || 'Unknown';
  }

  function getMemberName(member: Member): string {
    if (member.name) return member.name;
    if (member.user?.name) return member.user.name;
    if (member.user?.firstName || member.user?.lastName) {
      return [member.user.firstName, member.user.lastName].filter(Boolean).join(' ');
    }
    return member.email || member.user?.email || 'Unknown';
  }

  function getDeliveryOwnerName(project: Project): string {
    if (!project.deliveryOwner) return '—';
    if (project.deliveryOwner.name) return project.deliveryOwner.name;
    if (project.deliveryOwner.firstName || project.deliveryOwner.lastName) {
      return [project.deliveryOwner.firstName, project.deliveryOwner.lastName].filter(Boolean).join(' ');
    }
    return project.deliveryOwner.email || '—';
  }

  function getStatusLabel(status?: string): string {
    if (!status) return 'Draft';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }

  function getHealthLabel(status?: string, health?: string): string {
    if (health) {
      const normalized = health.toLowerCase();
      if (normalized === 'healthy') return 'Healthy';
      if (normalized === 'at_risk') return 'At Risk';
      if (normalized === 'blocked') return 'Blocked';
    }
    // Fallback to status
    if (!status) return 'Draft';
    const normalized = status.toLowerCase();
    if (normalized === 'active') return 'On track';
    if (normalized === 'completed') return 'Complete';
    if (normalized === 'cancelled' || normalized === 'on_hold') return 'Paused';
    return 'Draft';
  }

  // PHASE 6 MODULE 2: Compute metrics from projects
  function computeMetrics() {
    const activeProjects = allProjects.filter(p => p.status === 'active');
    const standaloneProjects = allProjects.filter(p => !p.programId && !p.portfolioId);
    const linkedProjects = allProjects.filter(p => p.programId || p.portfolioId);

    // Work items metrics - would need separate API call, hide if not available
    // Risks - from workspace home data if available
    const risksOpen = workspaceHomeData?.topRisksCount || 0;

    // Resource conflicts - would need separate API call, hide if not available

    return {
      activeProjects: activeProjects.length,
      standaloneProjects: standaloneProjects.length,
      linkedProjects: linkedProjects.length,
      totalProjects: allProjects.length,
      risksOpen,
    };
  }

  function getProjectTag(project: Project): string {
    if (project.programId && project.program) {
      return `Program: ${project.program.name}`;
    }
    if (project.portfolioId && project.portfolio) {
      return `Portfolio: ${project.portfolio.name}`;
    }
    return 'Standalone';
  }

  // PHASE 7 MODULE 7.3: Format activity text
  function formatActivityText(activity: ExecutionSummary['recentActivity'][0]): string {
    const actor = activity.actorName;
    const task = activity.workItemTitle;

    switch (activity.type) {
      case 'created':
        return `${actor} created "${task}"`;
      case 'status_changed':
        return `${actor} changed status of "${task}"`;
      case 'assigned':
        return `${actor} assigned "${task}"`;
      case 'unassigned':
        return `${actor} unassigned "${task}"`;
      case 'due_date_changed':
        return `${actor} changed due date of "${task}"`;
      case 'comment_added':
        return `${actor} commented on "${task}"`;
      case 'updated':
        return `${actor} updated "${task}"`;
      default:
        return `${actor} ${activity.type} "${task}"`;
    }
  }

  if (!workspaceId) {
    return (
      <div className="p-6" data-testid="workspace-home">
        <div className="text-center text-gray-500">
          <p>Select a workspace to view its overview</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6" data-testid="workspace-home">
        <div className="text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="p-6" data-testid="workspace-home">
        <div className="max-w-2xl mx-auto text-center py-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Workspace not found
          </h2>
          <p className="text-gray-600 mb-4">
            The workspace you're looking for doesn't exist or you don't have access to it.
          </p>
          <Button onClick={() => navigate('/workspaces')}>
            Back to Workspaces
          </Button>
        </div>
      </div>
    );
  }

  const isOwner = permissions.workspacePermission === 'owner';
  const canCreateWork = permissions.canCreateWork;
  const accessLevel = mapRoleToAccessLevel(workspaceRole);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto" data-testid="workspace-home">
      {/* PROMPT 5 Part B: Header block with actions */}
      <div className="border-b pb-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">
              {workspace.name}
            </h1>
            <p className="text-sm text-gray-500">
              Owner: {getOwnerName(workspace.owner)}
            </p>
          </div>
          {isOwner && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => navigate(`/workspaces/${workspaceId}/members`)}
                className="px-4 py-2"
              >
                Invite
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/workspaces/${workspaceId}/members`)}
                className="px-4 py-2"
              >
                Members
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/workspaces/${workspaceId}/settings`)}
                className="px-4 py-2"
              >
                Settings
              </Button>
              <div className="relative">
                <Button
                  ref={newButtonRef}
                  onClick={() => setShowNewMenu(!showNewMenu)}
                  className="px-4 py-2"
                >
                  New
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
                {showNewMenu && (
                  <div
                    ref={newMenuRef}
                    className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
                  >
                    <button
                      onClick={() => {
                        setShowProjectModal(true);
                        setShowNewMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                    >
                      New project
                    </button>
                    <button
                      onClick={() => {
                        navigate('/templates');
                        setShowNewMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                    >
                      Start from template
                    </button>
                    <div className="border-t border-gray-200 my-1"></div>
                    <button
                      onClick={() => {
                        navigate('/workspaces');
                        setShowNewMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-400 cursor-not-allowed"
                      disabled
                    >
                      New folder
                    </button>
                    <button
                      onClick={() => {
                        navigate('/workspaces');
                        setShowNewMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-400 cursor-not-allowed"
                      disabled
                    >
                      New document
                    </button>
                    <button
                      onClick={() => {
                        navigate('/workspaces');
                        setShowNewMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-400 cursor-not-allowed"
                      disabled
                    >
                      New form
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PROMPT 5 Part C.1: Start work section */}
      <div className="border-b pb-4">
        {canCreateWork ? (
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/templates')}
              className="px-6 py-2"
            >
              Start work from a template
            </Button>
            <button
              onClick={() => setShowProjectModal(true)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Create a project
            </button>
          </div>
        ) : (
          <p className="text-gray-600">Ask a workspace owner to start work</p>
        )}
      </div>

      {/* PHASE 7 MODULE 7.3: Execution Summary Widgets */}
      {workspaceHomeData?.executionSummary && (
        <div className="border-b pb-4">
          <h2 className="text-lg font-medium text-gray-900 mb-3">Execution Signals</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <WidgetCard
              title="Active Projects"
              value={workspaceHomeData.executionSummary.counts.activeProjects}
            />
            <WidgetCard
              title="Total Tasks"
              value={workspaceHomeData.executionSummary.counts.totalWorkItems}
            />
            <WidgetCard
              title="Overdue"
              value={workspaceHomeData.executionSummary.counts.overdueWorkItems}
              variant={workspaceHomeData.executionSummary.counts.overdueWorkItems > 0 ? 'danger' : undefined}
            />
            <WidgetCard
              title="Due Soon"
              value={workspaceHomeData.executionSummary.counts.dueSoon7Days}
              variant={workspaceHomeData.executionSummary.counts.dueSoon7Days > 0 ? 'warning' : undefined}
            />
            <WidgetCard
              title="In Progress"
              value={workspaceHomeData.executionSummary.counts.inProgress}
            />
            <WidgetCard
              title="Done (7d)"
              value={workspaceHomeData.executionSummary.counts.doneLast7Days}
            />
          </div>
        </div>
      )}

      {/* PHASE 6 MODULE 2: Project Overview Widgets (fallback if no executionSummary) */}
      {!workspaceHomeData?.executionSummary && (
        <div className="border-b pb-4">
          <h2 className="text-lg font-medium text-gray-900 mb-3">Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {(() => {
              const metrics = computeMetrics();
              return (
                <>
                  <WidgetCard
                    title="Active Projects"
                    value={metrics.activeProjects}
                    onClick={() => {
                      if (projectFilter === 'all') {
                        setProjectFilter(null);
                      } else {
                        setProjectFilter('all');
                      }
                      setTimeout(() => loadWorkspaceData(), 0);
                    }}
                    className="cursor-pointer hover:bg-gray-50"
                  />
                  <WidgetCard
                    title="Standalone"
                    value={metrics.standaloneProjects}
                    onClick={() => {
                      if (projectFilter === 'standalone') {
                        setProjectFilter(null);
                      } else {
                        setProjectFilter('standalone');
                      }
                      setTimeout(() => loadWorkspaceData(), 0);
                    }}
                    className="cursor-pointer hover:bg-gray-50"
                  />
                  <WidgetCard
                    title="Linked"
                    value={metrics.linkedProjects}
                    onClick={() => {
                      if (projectFilter === 'linked') {
                        setProjectFilter(null);
                      } else {
                        setProjectFilter('linked');
                      }
                      setTimeout(() => loadWorkspaceData(), 0);
                    }}
                    className="cursor-pointer hover:bg-gray-50"
                  />
                  {workspaceHomeData && workspaceHomeData.topRisksCount > 0 && (
                    <WidgetCard
                      title="Risks Open"
                      value={metrics.risksOpen}
                      variant="warning"
                    />
                  )}
                </>
              );
            })()}
          </div>
          {projectFilter && (
            <div className="mt-2 text-sm text-gray-600">
              Showing: {projectFilter === 'standalone' ? 'Standalone projects' : projectFilter === 'linked' ? 'Linked projects' : 'All projects'}
              <button
                onClick={() => {
                  setProjectFilter(null);
                  loadWorkspaceData();
                }}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                Clear filter
              </button>
            </div>
          )}
        </div>
      )}

      {/* PHASE 7 MODULE 7.3: Overdue Tasks and Recent Activity Panels */}
      {workspaceHomeData?.executionSummary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 border-b pb-4">
          {/* Overdue Tasks Panel */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Overdue Tasks
              {workspaceHomeData.executionSummary.counts.overdueWorkItems > 0 && (
                <span className="ml-2 text-sm font-normal text-red-600">
                  ({workspaceHomeData.executionSummary.counts.overdueWorkItems})
                </span>
              )}
            </h3>
            {workspaceHomeData.executionSummary.topOverdue.length === 0 ? (
              <p className="text-sm text-gray-500">No overdue tasks</p>
            ) : (
              <div className="space-y-3">
                {workspaceHomeData.executionSummary.topOverdue.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => navigate(`/projects/${item.projectId}?taskId=${item.id}`)}
                    className="p-3 border border-red-200 rounded-lg hover:bg-red-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{item.title}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          {item.projectName}
                          {item.assigneeName && ` • ${item.assigneeName}`}
                        </div>
                        {item.dueDate && (
                          <div className="text-xs text-red-600 mt-1">
                            Due: {new Date(item.dueDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity Panel */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            {workspaceHomeData.executionSummary.recentActivity.length === 0 ? (
              <p className="text-sm text-gray-500">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {workspaceHomeData.executionSummary.recentActivity.map((activity) => {
                  const activityText = formatActivityText(activity);
                  return (
                    <div key={`${activity.workItemId}-${activity.createdAt}`} className="text-sm">
                      <div className="text-gray-900">{activityText}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {activity.projectName} • {new Date(activity.createdAt).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PROMPT 5 Part C.2: Workspace notes section */}
      <div className="border-b pb-4">
        <h2 className="text-lg font-medium text-gray-900 mb-2">
          Workspace notes
        </h2>
        {editingNotes ? (
          <div className="space-y-2">
            <textarea
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              className="w-full min-h-[120px] p-3 border rounded-md resize-y"
              placeholder="Add workspace notes, rules, links, expectations..."
            />
            <div className="flex gap-2">
              <Button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="px-4 py-1 text-sm"
              >
                {savingNotes ? 'Saving...' : 'Save'}
              </Button>
              <Button
                onClick={() => {
                  setNotesValue(workspace.homeNotes || '');
                  setEditingNotes(false);
                }}
                variant="ghost"
                className="px-4 py-1 text-sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div>
            {workspace.homeNotes ? (
              <p className="text-gray-700 whitespace-pre-wrap">{workspace.homeNotes}</p>
            ) : (
              <p className="text-gray-400 italic">No notes yet.</p>
            )}
            {isOwner && (
              <button
                onClick={() => setEditingNotes(true)}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                Edit notes
              </button>
            )}
          </div>
        )}
      </div>

      {/* PROMPT 5 Part C.3: Projects snapshot */}
      <div className="border-b pb-4">
        <h2 className="text-lg font-medium text-gray-900 mb-3">Projects</h2>
        {projects.length === 0 ? (
          <div>
            {canCreateWork ? (
              <Button
                onClick={() => navigate('/templates')}
                variant="outline"
                className="px-4 py-2"
              >
                Start from template
              </Button>
            ) : (
              <p className="text-gray-500">No projects yet.</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="flex items-center justify-between p-3 border rounded hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{project.name}</span>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                      {getProjectTag(project)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {getStatusLabel(project.status)} · {getHealthLabel(project.status, project.health)} · {getDeliveryOwnerName(project)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* PROMPT 5 Part C.4: Members snapshot */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium text-gray-900">
            Members {totalMemberCount > 0 && <span className="text-sm text-gray-500 font-normal">({totalMemberCount})</span>}
          </h2>
          <div className="flex items-center gap-2">
            {isOwner && (
              <Button
                variant="outline"
                onClick={() => setShowInviteModal(true)}
                className="px-3 py-1 text-sm"
              >
                Invite members
              </Button>
            )}
            {isOwner ? (
              <Link
                to={`/workspaces/${workspaceId}/members`}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Manage members
              </Link>
            ) : (
              <Link
                to={`/workspaces/${workspaceId}/members`}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                View members
              </Link>
            )}
          </div>
        </div>
        {members.length === 0 ? (
          <p className="text-gray-500">No members yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700"
              >
                {getMemberName(member)}
              </div>
            ))}
            {totalMemberCount > 5 && (
              <Link
                to={`/workspaces/${workspaceId}/members`}
                className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700 hover:bg-gray-200"
              >
                +{totalMemberCount - 5} more
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Project Create Modal */}
      {showProjectModal && (
        <ProjectCreateModal
          open={showProjectModal}
          onClose={() => setShowProjectModal(false)}
          onCreated={(projectId) => {
            setShowProjectModal(false);
            loadWorkspaceData();
            navigate(`/projects/${projectId}`);
          }}
          workspaceId={workspaceId}
        />
      )}

      {/* PROMPT 6 C2: Invite Members Modal */}
      {showInviteModal && (
        <WorkspaceMemberInviteModal
          open={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          onInvite={async (userId: string, accessLevel: 'Owner' | 'Member' | 'Guest') => {
            if (!workspaceId) return;
            try {
              const role = mapAccessLevelToRole(accessLevel);
              await addWorkspaceMember(workspaceId, userId, role as any);
              toast.success('Member added successfully');
              setShowInviteModal(false);
              loadWorkspaceData();
            } catch (error: any) {
              console.error('Failed to add member:', error);
              const errorCode = error?.response?.data?.code;
              const errorMessage = error?.response?.data?.message;
              const displayMessage = errorMessage || 'Failed to add member';
              toast.error(displayMessage);
            }
          }}
          workspaceId={workspaceId}
        />
      )}
    </div>
  );
}

// PHASE 6 MODULE 2: Widget Card Component
function WidgetCard({
  title,
  value,
  onClick,
  className = '',
  variant = 'default'
}: {
  title: string;
  value: number;
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'warning' | 'danger';
}) {
  const baseClasses = "p-4 border rounded-lg bg-white";
  const variantClasses = {
    default: "border-gray-200",
    warning: "border-yellow-200 bg-yellow-50",
    danger: "border-red-200 bg-red-50",
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      onClick={onClick}
    >
      <div className="text-sm text-gray-600 mb-1">{title}</div>
      <div className={`text-2xl font-semibold ${onClick ? 'text-blue-600' : 'text-gray-900'}`}>
        {value}
      </div>
    </div>
  );
}
