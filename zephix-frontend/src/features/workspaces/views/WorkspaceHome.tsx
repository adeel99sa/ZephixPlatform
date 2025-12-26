import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspaceStore } from "@/state/workspace.store";
import { useAuth } from "@/state/AuthContext";
import { getWorkspace, getKpiSummary, listProjects, listTasksDueThisWeek, listRecentUpdates } from "@/features/workspaces/workspace.api";
import { Button } from "@/components/ui/Button";
import { track } from "@/lib/telemetry";
import { ProjectCreateModal } from "@/features/projects/ProjectCreateModal";
import { getAdminRouteOutcomes } from "@/components/routing/RouteLogger";

export default function WorkspaceHome() {
  const workspaceId = useWorkspaceStore(s => s.activeWorkspaceId);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [ws, setWs] = useState<any>(null);
  const [kpi, setKpi] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProjectModal, setShowProjectModal] = useState(false);
  // Track previous workspaceId for switch events
  const previousWorkspaceIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Guard: Don't fire requests until auth state is READY
    if (authLoading) {
      return;
    }
    // Only load if user is authenticated
    if (!user) {
      setLoading(false);
      return;
    }
    // Guard: Don't fetch if organizationId doesn't exist
    if (!user.organizationId) {
      setLoading(false);
      return;
    }
    // Guard: Don't fetch if workspaceId doesn't exist
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const fromWorkspaceId = previousWorkspaceIdRef.current;
    const toWorkspaceId = workspaceId;

    // Log workspace switch start
    console.log('[Route] workspace_switch_start', {
      fromWorkspaceId,
      toWorkspaceId,
      workspaceId: toWorkspaceId,
      userId: user.id,
      orgId: user.organizationId,
      timestamp: new Date().toISOString(),
    });

    (async () => {
      try {
        const [w, k, p] = await Promise.all([
          getWorkspace(workspaceId).catch(async (error: any) => {
            // Handle 403 explicitly
            if (error?.response?.status === 403) {
              console.log('[Route] workspace_switch_403', {
                fromWorkspaceId,
                toWorkspaceId,
                workspaceId: toWorkspaceId,
                userId: user.id,
                orgId: user.organizationId,
                timestamp: new Date().toISOString(),
              });
              navigate('/403');
              return null;
            }
            // Handle 404 or other errors
            if (error?.response?.status === 404 || !error?.response) {
              console.log('[Route] workspace_switch_not_found', {
                fromWorkspaceId,
                toWorkspaceId,
                workspaceId: toWorkspaceId,
                userId: user.id,
                orgId: user.organizationId,
                timestamp: new Date().toISOString(),
              });
              return null;
            }
            throw error;
          }),
          getKpiSummary(workspaceId).catch(() => null), // Gracefully handle 404
          listProjects(workspaceId).catch(() => []), // Gracefully handle errors
        ]);

        // If workspace is null (not found or 403), show not found state
        if (!w) {
          setWs(null);
          setKpi(null);
          setProjects([]);
          setTasks([]);
          setRecent([]);
          setLoading(false);
          return;
        }

        setWs(w);
        setKpi(k);
        setProjects(p);

        // Log workspace switch success
        console.log('[Route] workspace_switch_success', {
          fromWorkspaceId,
          toWorkspaceId,
          workspaceId: toWorkspaceId,
          userId: user.id,
          orgId: user.organizationId,
          timestamp: new Date().toISOString(),
        });

        // Update previous workspaceId after successful switch
        previousWorkspaceIdRef.current = toWorkspaceId;

        // Phase 6: Only load tasks and updates if workspace has content (avoid 404s for empty workspaces)
        if (p && p.length > 0) {
          try {
            const [t, r] = await Promise.all([
              listTasksDueThisWeek(workspaceId).catch(() => []),
              listRecentUpdates(workspaceId).catch(() => []),
            ]);
            setTasks(t); setRecent(r);
          } catch (error) {
            // Silently handle 404s for empty workspaces
            setTasks([]); setRecent([]);
          }
        } else {
          setTasks([]); setRecent([]);
        }
      } catch (error: any) {
        console.error("Failed to load workspace home:", error);

        // Log workspace switch error
        console.log('[Route] workspace_switch_error', {
          fromWorkspaceId,
          toWorkspaceId,
          workspaceId: toWorkspaceId,
          userId: user?.id,
          orgId: user?.organizationId,
          error: error?.message || String(error),
          errorClass: error?.constructor?.name || (error instanceof Error ? error.constructor.name : 'Unknown'),
          statusCode: error?.response?.status || error?.status || null,
          timestamp: new Date().toISOString(),
        });

        // Set safe defaults on error
        setWs(null);
        setKpi(null);
        setProjects([]);
        setTasks([]);
        setRecent([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [workspaceId, authLoading, user, navigate]);

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

  // Show Not Found state if workspace is null (invalid workspaceId or 403)
  if (!ws) {
    return (
      <div className="p-6" data-testid="workspace-home">
        <div className="max-w-2xl mx-auto text-center py-12">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Workspace not found
            </h2>
            <p className="text-gray-600">
              The workspace you're looking for doesn't exist or you don't have access to it.
            </p>
          </div>
          <Button onClick={() => navigate('/workspaces')}>
            Back to Workspaces
          </Button>
        </div>
      </div>
    );
  }

  // Phase 2: Show empty state for new workspaces with no projects
  // Removed precreated placeholders - only show "Create Project" action
  const hasNoProjects = !projects || projects.length === 0;

  if (hasNoProjects) {
    return (
      <div className="p-6" data-testid="workspace-home">
        <div className="max-w-2xl mx-auto text-center py-12">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              {ws?.name || "Workspace"} is empty
            </h2>
            <p className="text-gray-600">
              Get started by creating your first project.
            </p>
          </div>

          <div className="mt-8 flex items-center justify-center gap-3">
            <Button
              onClick={() => setShowProjectModal(true)}
              className="px-6 py-3"
              data-testid="empty-state-new-project"
            >
              Create a project
            </Button>

            {/* Three dots menu for create project */}
            <div className="relative">
              <button
                onClick={() => setShowProjectModal(true)}
                className="p-2 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                data-testid="empty-state-new-project-menu"
                aria-label="Create project menu"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <ProjectCreateModal
          open={showProjectModal}
          onClose={() => setShowProjectModal(false)}
          onCreated={(projectId) => {
            setShowProjectModal(false);
            navigate(`/projects/${projectId}`);
            // Refresh workspace data
            window.location.reload();
          }}
          workspaceId={workspaceId}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="workspace-home">
      {/* Owner / Contact */}
      <div className="rounded-2xl border p-4" data-testid="ws-home-owner">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">{ws?.name || "Untitled Workspace"}</div>
            <div className="text-sm text-gray-500">{ws?.description || "Add workspace description"}</div>
            {ws?.owner && (
              <div className="mt-2 text-sm">Owner: <span className="font-medium">{ws.owner.name || ws.owner.email}</span></div>
            )}
          </div>
          <Button onClick={()=>{
            // open ⌘K workspace settings programmatically for convenience
            const ev = new KeyboardEvent("keydown", { key: "k", metaKey: true });
            document.dispatchEvent(ev);
            track("workspace.settings.fromHome", { workspaceId });
          }}>Settings (⌘K)</Button>
        </div>
      </div>

      {/* KPIs - Only show if KPI data exists (not for empty workspaces) */}
      {kpi && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="ws-home-kpis">
          {[
            { label: "Open Tasks", value: kpi?.openTasks ?? 0 },
            { label: "Completed (7d)", value: kpi?.completed7d ?? 0 },
            { label: "Overdue", value: kpi?.overdue ?? 0 },
            { label: "Active Projects", value: kpi?.activeProjects ?? 0 },
          ].map(card=>(
            <div key={card.label} className="rounded-xl border p-3">
              <div className="text-2xl font-semibold">{card.value}</div>
              <div className="text-xs text-gray-500">{card.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Active Projects */}
      <div className="rounded-2xl border p-4" data-testid="ws-home-projects">
        <div className="mb-2 flex items-center justify-between">
          <div className="font-medium">Active Projects</div>
          <Button variant="ghost">View all</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {projects.slice(0,4).map(p=>(
            <div key={p.id} className="rounded border p-3">
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-gray-500">{p.progress || 0}% complete</div>
            </div>
          ))}
          {projects.length===0 && <div className="text-sm text-gray-500 col-span-2">No projects yet.</div>}
        </div>
      </div>

      {/* Tasks due this week */}
      <div className="rounded-2xl border p-4" data-testid="ws-home-tasks-due">
        <div className="mb-2 font-medium">Tasks due this week</div>
        <ul className="divide-y">
          {tasks.slice(0,6).map(t=>(
            <li key={t.id} className="py-2 flex justify-between">
              <div>{t.title || t.name}</div>
              <div className="text-xs text-gray-500">{t.dueDate || t.due_date}</div>
            </li>
          ))}
          {tasks.length===0 && <li className="text-sm text-gray-500 py-2">Nothing due this week.</li>}
        </ul>
      </div>

      {/* Recent updates */}
      <div className="rounded-2xl border p-4" data-testid="ws-home-updates">
        <div className="mb-2 font-medium">Recent updates</div>
        <ul className="divide-y">
          {recent.slice(0,8).map((r, i)=>(
            <li key={i} className="py-2 text-sm">
              <span className="font-medium">{r.actor || r.user?.name || "System"}</span> {r.action || "updated"} <span className="text-gray-600">{r.target || r.entity}</span> · <span className="text-gray-500">{r.when || r.created_at}</span>
            </li>
          ))}
          {recent.length===0 && <li className="text-sm text-gray-500 py-2">No recent activity.</li>}
        </ul>
      </div>

      {/* Quick actions */}
      <div className="rounded-2xl border p-4" data-testid="ws-home-quick-actions">
        <div className="mb-2 font-medium">Quick actions</div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={()=>track("workspace.quick.newProject", {workspaceId})}>New Project</Button>
          <Button onClick={()=>track("workspace.quick.newBoard", {workspaceId})}>New Board</Button>
          <Button onClick={()=>track("workspace.quick.invite", {workspaceId})}>Invite Member</Button>
          <Button onClick={()=>{
            window.location.href = "/templates";
            track("workspace.quick.templateCenter", {workspaceId});
          }}>Template Center</Button>
        </div>
      </div>
    </div>
  );
}


