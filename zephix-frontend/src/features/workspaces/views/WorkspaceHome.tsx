import { useEffect, useState } from "react";
import { useWorkspaceStore } from "@/state/workspace.store";
import { getWorkspace, getKpiSummary, listProjects, listTasksDueThisWeek, listRecentUpdates } from "@/features/workspaces/workspace.api";
import { Button } from "@/components/ui/Button";
import { track } from "@/lib/telemetry";

export default function WorkspaceHome() {
  const workspaceId = useWorkspaceStore(s => s.activeWorkspaceId);
  const [ws, setWs] = useState<any>(null);
  const [kpi, setKpi] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    (async () => {
      try {
        const [w, k, p, t, r] = await Promise.all([
          getWorkspace(workspaceId),
          getKpiSummary(workspaceId),
          listProjects(workspaceId),
          listTasksDueThisWeek(workspaceId),
          listRecentUpdates(workspaceId),
        ]);
        setWs(w); setKpi(k); setProjects(p); setTasks(t); setRecent(r);
      } catch (error) {
        console.error("Failed to load workspace home:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, [workspaceId]);

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

      {/* KPIs */}
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


