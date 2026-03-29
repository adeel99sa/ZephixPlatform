import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, ArrowRight, FolderOpen, Plus, UserPlus } from "lucide-react";
import { request } from "@/lib/api";
import { useAuth } from "@/state/AuthContext";
import { useWorkspaceStore } from "@/state/workspace.store";
import {
  useTemplateCenterModalStore,
  WORKSPACE_CREATE_NEXT_TEMPLATE_CENTER,
} from "@/state/templateCenterModal.store";
import { listWorkspaces, type Workspace } from "@/features/workspaces/api";
import { useProjects } from "@/features/projects/hooks";
import { WorkspaceCreateModal } from "@/features/workspaces/WorkspaceCreateModal";
import { isPlatformAdmin } from "@/utils/access";
import { track } from "@/lib/telemetry";
import { InviteTeamModal } from "./InviteTeamModal";

type ActivityItem = {
  id: string;
  title: string;
  projectName: string;
  workspaceName: string;
  updatedAt: string;
};

export default function HomePage() {
  const nav = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  const openTemplateCenter = useTemplateCenterModalStore(
    (s) => s.openTemplateCenter,
  );
  const isAdmin = isPlatformAdmin(user);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [showCreateWs, setShowCreateWs] = useState(false);
  const [showInviteTeam, setShowInviteTeam] = useState(false);
  const [createWorkspaceNextRoute, setCreateWorkspaceNextRoute] = useState<string | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const { data: projects } = useProjects(activeWorkspaceId);

  useEffect(() => {
    if (authLoading || !user) return;
    listWorkspaces()
      .then((data) => setWorkspaces(Array.isArray(data) ? data : []))
      .catch(() => setWorkspaces([]));
    request
      .get<{ items?: ActivityItem[] }>("/my-work")
      .then((data) => setRecentActivity(Array.isArray(data?.items) ? data.items.slice(0, 5) : []))
      .catch(() => setRecentActivity([]));
  }, [authLoading, user]);

  useEffect(() => {
    track("home_viewed", { hasWorkspace: Boolean(activeWorkspaceId) });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const firstName = user?.firstName || user?.email?.split("@")[0] || "there";
  const available = workspaces.filter((w) => !w.deletedAt);
  const recentProjects = (projects ?? []).filter((p) => !p.deletedAt).slice(0, 6);

  function openTemplateCenterFromHome() {
    if (activeWorkspaceId) {
      openTemplateCenter(activeWorkspaceId);
      return;
    }

    const fallbackWorkspaceId = available[0]?.id;
    if (fallbackWorkspaceId) {
      setActiveWorkspace(fallbackWorkspaceId);
      openTemplateCenter(fallbackWorkspaceId);
      return;
    }

    if (isAdmin) {
      setCreateWorkspaceNextRoute(WORKSPACE_CREATE_NEXT_TEMPLATE_CENTER);
      setShowCreateWs(true);
      return;
    }

    nav("/workspaces");
  }

  return (
    <div className="bg-[#F5F7FA] p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-xl border border-[#E2E6EA] bg-[#FFFFFF] px-5 py-4">
          <h1 className="text-2xl font-semibold text-[#1F2937]">Home</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Welcome back, {firstName}. Pick up recent work or start something new.
          </p>
        </header>

        <section>
          <h2 className="mb-3 text-sm font-medium text-[#6B7280]">Quick actions</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              onClick={() => {
                setCreateWorkspaceNextRoute(null);
                setShowCreateWs(true);
              }}
              disabled={!isAdmin}
              className="flex items-center gap-3 rounded-xl border border-[#E2E6EA] bg-[#FFFFFF] p-4 text-left transition-all hover:border-[#2F6FED] hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E8F0FF] text-[#2F6FED]">
                <Plus className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-medium text-[#1F2937]">Create workspace</div>
                <div className="text-xs text-[#6B7280]">Start a new workspace</div>
              </div>
            </button>

            <button
              onClick={openTemplateCenterFromHome}
              className="flex items-center gap-3 rounded-xl border border-[#E2E6EA] bg-[#FFFFFF] p-4 text-left transition-all hover:border-[#2F6FED] hover:shadow-sm"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F1F3F6] text-[#2F6FED]">
                <FolderOpen className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-medium text-[#1F2937]">Use template</div>
                <div className="text-xs text-[#6B7280]">Open Template Center</div>
              </div>
            </button>

            <button
              onClick={() => setShowInviteTeam(true)}
              disabled={!isAdmin}
              className="flex items-center gap-3 rounded-xl border border-[#E2E6EA] bg-[#FFFFFF] p-4 text-left transition-all hover:border-[#2F6FED] hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F1F3F6] text-[#2F6FED]">
                <UserPlus className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-medium text-[#1F2937]">Invite team</div>
                <div className="text-xs text-[#6B7280]">Invite people to a workspace</div>
              </div>
            </button>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-[#6B7280]">Recent workspaces</h2>
          {available.length === 0 ? (
            <div className="rounded-xl border border-[#E2E6EA] bg-[#FFFFFF] p-4 text-sm text-[#6B7280]">
              No workspaces yet. {isAdmin ? "Use Create workspace to get started." : "Ask an admin to add you to a workspace."}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {available.slice(0, 6).map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => {
                    setActiveWorkspace(ws.id);
                    nav(`/workspaces/${ws.id}`);
                  }}
                  className="flex items-center justify-between rounded-xl border border-[#E2E6EA] bg-[#FFFFFF] px-3 py-2 text-left hover:border-[#2F6FED]"
                >
                  <span className="text-sm text-[#1F2937] truncate">{ws.name}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-[#9CA3AF]" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-[#6B7280]">Recent projects</h2>
          {recentProjects.length === 0 ? (
            <div className="rounded-xl border border-[#E2E6EA] bg-[#FFFFFF] p-4 text-sm text-[#6B7280]">
              No recent projects yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {recentProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => nav(`/projects/${project.id}`)}
                  className="flex items-center justify-between rounded-xl border border-[#E2E6EA] bg-[#FFFFFF] px-3 py-2 text-left hover:border-[#2F6FED]"
                >
                  <span className="text-sm text-[#1F2937] truncate">{project.name}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-[#9CA3AF]" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-[#9CA3AF]" />
            <h2 className="text-sm font-medium text-[#6B7280]">Recent activity</h2>
          </div>
          {recentActivity.length === 0 ? (
            <div className="rounded-xl border border-[#E2E6EA] bg-[#FFFFFF] p-4 text-sm text-[#6B7280]">
              No recent activity yet.
            </div>
          ) : (
            <div className="space-y-2">
              {recentActivity.map((item) => (
                <button
                  key={item.id}
                  onClick={() => nav("/my-tasks")}
                  className="w-full rounded-xl border border-[#E2E6EA] bg-[#FFFFFF] px-3 py-2 text-left hover:border-[#2F6FED]"
                >
                  <p className="text-sm text-[#1F2937] truncate">{item.title}</p>
                  <p className="mt-0.5 text-xs text-[#6B7280]">
                    {item.workspaceName} • {item.projectName}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <WorkspaceCreateModal
        open={showCreateWs}
        onClose={() => setShowCreateWs(false)}
        nextRoute={createWorkspaceNextRoute}
        onCreated={() => {
          setShowCreateWs(false);
          setCreateWorkspaceNextRoute(null);
          listWorkspaces()
            .then((data) => setWorkspaces(Array.isArray(data) ? data : []))
            .catch(() => {});
        }}
      />
      <InviteTeamModal
        open={showInviteTeam}
        onClose={() => setShowInviteTeam(false)}
      />
    </div>
  );
}
