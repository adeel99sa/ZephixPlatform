import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/state/AuthContext";
import { useOrgHomeState } from "@/features/organizations/useOrgHomeState";
import { useWorkspaceStore } from "@/state/workspace.store";
import { useQuery } from "@tanstack/react-query";
import { listWorkspaces } from "@/features/workspaces/api";
import { platformRoleFromUser } from "@/utils/roles";
import { MemberOnboardingCard } from "@/features/onboarding/MemberOnboardingCard";
import { ViewerOnboardingCard } from "@/features/onboarding/ViewerOnboardingCard";
import { track } from "@/lib/telemetry";
import {
  Briefcase,
  LayoutDashboard,
  ListChecks,
  Layers,
  Users,
  ArrowRight,
  Clock,
  HelpCircle,
  BookOpen,
  PlusCircle,
} from "lucide-react";

/**
 * UnifiedHomePage — Personalized operational landing for all roles.
 * Admin first-time setup runs on /onboarding only; Home stays a hub (no giant wizard).
 * Inbox remains a separate destination at /inbox.
 */
export default function UnifiedHomePage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { isLoading, workspaceCount, isAdmin, isMember, isViewer } = useOrgHomeState();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);

  const wsQuery = useQuery({
    queryKey: ["workspaces-list-home"],
    queryFn: listWorkspaces,
    enabled: workspaceCount > 0,
    staleTime: 30_000,
  });
  const workspaces = wsQuery.data ?? [];

  const firstName = user?.firstName || user?.email?.split("@")[0] || "there";
  const role = platformRoleFromUser(user);

  useEffect(() => {
    track("home_viewed", { role, workspaceCount });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Welcome back, {firstName}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {isAdmin && "Your organization overview and priority actions."}
          {isMember && "Your work and recent activity."}
          {isViewer && "Your read-only view of shared content."}
        </p>
      </header>

      {/* Compact role guidance (not Admin full-page onboarding) */}
      {isMember && <MemberOnboardingCard />}
      {isViewer && <ViewerOnboardingCard />}

      {/* Admin empty hub — no oversized onboarding hero */}
      {isAdmin && workspaceCount === 0 && (
        <div
          className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/90 via-white to-cyan-50/80 p-6 shadow-sm"
          data-testid="admin-empty-hub"
        >
          <h2 className="text-lg font-semibold text-gray-900">Your hub is ready</h2>
          <p className="mt-1 text-sm text-gray-600">
            Create a workspace when you are ready, or explore help and learning resources.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/workspaces"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <PlusCircle className="h-4 w-4" />
              Create workspace
            </Link>
            <a
              href="https://zephix.dev/help"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <HelpCircle className="h-4 w-4 text-gray-500" />
              Help center
            </a>
            <a
              href="https://zephix.dev/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <BookOpen className="h-4 w-4 text-gray-500" />
              Learn Zephix
            </a>
          </div>
        </div>
      )}

      {activeWorkspaceId && workspaces.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-indigo-100 bg-indigo-50/50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-900">
              Continue in{" "}
              <span className="text-indigo-600">
                {workspaces.find((w) => w.id === activeWorkspaceId)?.name ?? "workspace"}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => nav(`/workspaces/${activeWorkspaceId}`)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
          >
            Open <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}

      {workspaces.length > 0 && (
        <Section title="Recent workspaces">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {workspaces.slice(0, 6).map((ws) => (
              <button
                key={ws.id}
                type="button"
                onClick={() => {
                  setActiveWorkspace(ws.id);
                  nav(`/workspaces/${ws.id}`);
                }}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 text-left transition-all hover:border-gray-300 hover:shadow-sm"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Briefcase className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{ws.name}</p>
                  <p className="text-xs text-gray-400">{ws.slug}</p>
                </div>
              </button>
            ))}
          </div>
        </Section>
      )}

      {isAdmin && workspaces.length > 0 && (
        <Section title="Priority actions">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ActionCard
              icon={<Users className="h-4 w-4" />}
              label="Invite members"
              description="Grow your team"
              onClick={() => nav("/administration/users")}
            />
            <ActionCard
              icon={<Layers className="h-4 w-4" />}
              label="Templates"
              description="Create from template"
              onClick={() => nav("/templates")}
            />
            <ActionCard
              icon={<LayoutDashboard className="h-4 w-4" />}
              label="Dashboards"
              description="View workspace metrics"
              onClick={() => nav("/dashboards")}
            />
          </div>
        </Section>
      )}

      {isMember && (
        <Section title="Your work">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ActionCard
              icon={<ListChecks className="h-4 w-4" />}
              label="My Tasks"
              description="Assigned and due items"
              onClick={() => nav("/projects")}
            />
            <ActionCard
              icon={<Clock className="h-4 w-4" />}
              label="Recent activity"
              description="Latest workspace updates"
              onClick={() => nav("/inbox")}
            />
            <ActionCard
              icon={<Briefcase className="h-4 w-4" />}
              label="Workspaces"
              description="Open a workspace"
              onClick={() => nav("/workspaces")}
            />
          </div>
        </Section>
      )}

      {isViewer && (
        <Section title="Shared with you">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ActionCard
              icon={<LayoutDashboard className="h-4 w-4" />}
              label="Dashboards"
              description="Published dashboards"
              onClick={() => nav("/dashboards")}
            />
            <ActionCard
              icon={<Briefcase className="h-4 w-4" />}
              label="Workspace summaries"
              description="Project health and status"
              onClick={() => nav("/workspaces")}
            />
          </div>
        </Section>
      )}

      <Section title="Resources">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ActionCard
            icon={<BookOpen className="h-4 w-4" />}
            label="Learn Zephix"
            description="Guides and tutorials"
            onClick={() => window.open("https://zephix.dev/docs", "_blank")}
            muted
          />
          <ActionCard
            icon={<HelpCircle className="h-4 w-4" />}
            label="Help center"
            description="FAQ and support"
            onClick={() => window.open("https://zephix.dev/help", "_blank")}
            muted
          />
          {isAdmin && (
            <ActionCard
              icon={<Layers className="h-4 w-4" />}
              label="Templates"
              description="Browse project templates"
              onClick={() => nav("/templates")}
              muted
            />
          )}
        </div>
      </Section>
    </div>
  );
}

function Section(p: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">{p.title}</h2>
      {p.children}
    </section>
  );
}

function ActionCard(p: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={p.onClick}
      className={`flex items-center gap-3 rounded-lg border bg-white p-4 text-left transition-all hover:shadow-sm ${
        p.muted
          ? "border-gray-100 opacity-75 hover:opacity-100"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-500">{p.icon}</div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900">{p.label}</p>
        <p className="text-xs text-gray-400">{p.description}</p>
      </div>
    </button>
  );
}
