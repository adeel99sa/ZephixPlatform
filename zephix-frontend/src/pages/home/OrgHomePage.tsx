import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Briefcase,
  FolderOpen,
  HelpCircle,
  Inbox,
  ListChecks,
  Mail,
  Plus,
} from "lucide-react";

import {
  PageHeader,
  PageHeaderLeft,
  PageHeaderCenter,
  PageHeaderRight,
  PageTitle,
  PageSubtitle,
} from "@/ui/components/PageHeader";
import { EmptyState } from "@/ui/components/EmptyState";
import { Button } from "@/ui/components/Button";
import { useOrgHomeState } from "@/features/organizations/useOrgHomeState";
import { skipOnboarding } from "@/features/organizations/onboarding.api";
import { listWorkspaces, type Workspace } from "@/features/workspaces/api";
import { WorkspaceCreateModal } from "@/features/workspaces/WorkspaceCreateModal";
import { useWorkspaceStore } from "@/state/workspace.store";
import { useAuth } from "@/state/AuthContext";
import { useInboxDrawer } from "@/ui/shell/AppShell";
import { track } from "@/lib/telemetry";

type QuickCardProps = {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
};

function QuickCard({ title, description, icon, onClick }: QuickCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-start gap-4 rounded-xl border border-z-border bg-z-bg-elevated p-4 text-left shadow-sm transition-all duration-z-fast ease-spring hover:border-z-border-strong hover:shadow-md"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-z-bg-sunken text-z-text-secondary">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-z-text-primary group-hover:text-z-text-primary">
          {title}
        </div>
        <div className="mt-1 text-xs leading-5 text-z-text-secondary">{description}</div>
      </div>
    </button>
  );
}

type WorkspaceRowProps = {
  workspace: Workspace;
  active: boolean;
  onOpen: () => void;
};

function WorkspaceRow({ workspace, active, onOpen }: WorkspaceRowProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all duration-z-fast ${
        active
          ? "border-z-border-brand bg-z-bg-selected shadow-sm"
          : "border-z-border bg-z-bg-elevated hover:border-z-border-strong hover:shadow-sm"
      }`}
    >
      <div className="min-w-0">
        <div className={`truncate text-sm font-semibold ${active ? "text-z-text-brand" : "text-z-text-primary"}`}>
          {workspace.name}
        </div>
        <div className="mt-1 text-xs text-z-text-secondary">
          {active ? "Currently selected workspace" : "Open workspace"}
        </div>
      </div>
      <div className={`shrink-0 text-xs font-medium ${active ? "text-z-text-brand" : "text-z-text-secondary"}`}>
        Open
      </div>
    </button>
  );
}

export default function OrgHomePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isLoading: orgLoading, workspaceCount, isAdmin, isMember, isViewer } = useOrgHomeState();

  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
  const { openInbox } = useInboxDrawer();

  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  const nextFromQuery = searchParams.get("next");

  const workspaceQuery = useQuery({
    queryKey: ["org-home-workspaces"],
    queryFn: listWorkspaces,
    enabled: workspaceCount > 0,
    staleTime: 30_000,
  });

  const workspaces = workspaceQuery.data ?? [];
  const firstName = user?.firstName || user?.email?.split("@")[0] || "there";

  useEffect(() => {
    track("org_home_viewed", {
      workspaceCount,
      isAdmin,
      isMember,
      isViewer,
    });
  }, [workspaceCount, isAdmin, isMember, isViewer]);

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.id === activeWorkspaceId) ?? null,
    [workspaces, activeWorkspaceId],
  );

  function openWorkspace(workspace: Workspace) {
    setActiveWorkspace(workspace.id, workspace.name);

    if (nextFromQuery) {
      navigate(decodeURIComponent(nextFromQuery), { replace: true });
      return;
    }

    navigate(`/workspaces/${workspace.id}/dashboard`, { replace: true });
  }

  async function handleSkipSetup() {
    setIsSkipping(true);
    try {
      await skipOnboarding();
      await queryClient.invalidateQueries({ queryKey: ["org-onboarding-status"] });
    } finally {
      setIsSkipping(false);
    }
  }

  if (orgLoading) {
    return (
      <div className="min-h-screen bg-z-bg-sunken px-8 py-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="h-8 w-56 animate-pulse rounded bg-z-bg-active" />
          <div className="h-4 w-96 animate-pulse rounded bg-z-bg-sunken" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="h-24 animate-pulse rounded-xl bg-z-bg-sunken" />
            <div className="h-24 animate-pulse rounded-xl bg-z-bg-sunken" />
            <div className="h-24 animate-pulse rounded-xl bg-z-bg-sunken" />
          </div>
          <div className="h-64 animate-pulse rounded-xl bg-z-bg-sunken" />
        </div>
      </div>
    );
  }

  if (isViewer) {
    const currentHour = new Date().getHours();
    const greeting = currentHour < 12 ? "Good morning" : currentHour < 17 ? "Good afternoon" : "Good evening";
    return (
      <div className="min-h-screen bg-z-bg-sunken">
        <PageHeader variant="compact">
          <PageHeaderLeft />
          <PageHeaderCenter>
            <PageTitle>Home</PageTitle>
            <PageSubtitle>Shared work will appear here when assigned to you</PageSubtitle>
          </PageHeaderCenter>
          <PageHeaderRight />
        </PageHeader>
        <main className="px-8 py-8 max-w-4xl mx-auto space-y-8">
          <EmptyState
            icon={Briefcase}
            headline={`${greeting} — no workspace access yet`}
            description="Ask an admin to add you to a workspace or send you an invite."
            primaryAction={{
              label: "Join workspace",
              onClick: () => navigate("/join/workspace"),
            }}
            suggestion="Use the join link from your admin to get access."
            visual="elevated"
          />
          <div className="flex flex-wrap gap-4 text-xs text-z-text-tertiary">
            <a
              href="https://docs.zephix.io"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-z-text-secondary"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              Help docs
            </a>
          </div>
        </main>
      </div>
    );
  }

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12 ? "Good morning" : currentHour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="min-h-screen bg-z-bg-sunken">
      <PageHeader variant="compact">
        <PageHeaderLeft>
          <PageTitle>Home</PageTitle>
        </PageHeaderLeft>
        <PageHeaderCenter>
          <PageSubtitle>
            Welcome back, {firstName}. Use Home for orientation, then move into Inbox, My Tasks, or a workspace.
          </PageSubtitle>
        </PageHeaderCenter>
        <PageHeaderRight />
      </PageHeader>

      <main className="px-8 py-8 max-w-5xl mx-auto space-y-8">
        {activeWorkspace ? (
          <section className="rounded-xl border border-z-border bg-z-bg-elevated p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="text-base font-semibold text-z-text-primary">Continue in workspace</div>
                <div className="mt-1 text-sm text-z-text-secondary">{activeWorkspace.name}</div>
              </div>
              <Button
                variant="primary"
                size="md"
                onClick={() => openWorkspace(activeWorkspace)}
              >
                Open Workspace
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </section>
        ) : null}

        {workspaceCount === 0 && isAdmin ? (
          <EmptyState
            icon={Briefcase}
            iconSize="lg"
            headline={`${greeting}, let's set up your workspace`}
            description="Workspaces hold projects, people, dashboards, and documents. Start there first."
            primaryAction={{
              label: "Create Workspace",
              onClick: () => setShowCreateWorkspace(true),
            }}
            secondaryAction={{
              label: isSkipping ? "Skipping..." : "Skip setup",
              onClick: handleSkipSetup,
              disabled: isSkipping,
            }}
            suggestion="Start with a template to get a pre-configured workspace."
            visual="elevated"
            className="max-w-2xl mx-auto"
          />
        ) : null}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <QuickCard
            title="Inbox"
            description="Triage incoming updates and alerts."
            icon={<Inbox className="h-5 w-5" />}
            onClick={() => openInbox()}
          />
          <QuickCard
            title="My Tasks"
            description="Execute assigned work."
            icon={<ListChecks className="h-5 w-5" />}
            onClick={() => navigate("/my-tasks")}
          />
          <QuickCard
            title="Workspaces"
            description="Browse and enter team delivery spaces."
            icon={<FolderOpen className="h-5 w-5" />}
            onClick={() => navigate("/workspaces")}
          />
        </section>

        {workspaceCount > 0 ? (
          <section className="rounded-xl border border-z-border bg-z-bg-elevated p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-base font-semibold text-z-text-primary">Workspace picker</div>
                <div className="mt-1 text-sm text-z-text-secondary">Choose where you want to work.</div>
              </div>
              {isAdmin ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowCreateWorkspace(true)}
                >
                  Create Workspace
                </Button>
              ) : null}
            </div>

            {workspaceQuery.isLoading ? (
              <div className="text-sm text-z-text-secondary">Loading workspaces...</div>
            ) : workspaces.length === 0 ? (
              <div className="text-sm text-z-text-secondary">No workspaces available.</div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {workspaces.map((workspace) => (
                  <WorkspaceRow
                    key={workspace.id}
                    workspace={workspace}
                    active={workspace.id === activeWorkspaceId}
                    onOpen={() => openWorkspace(workspace)}
                  />
                ))}
              </div>
            )}
          </section>
        ) : null}

        <div className="flex flex-wrap gap-4 text-xs text-z-text-tertiary">
          <a
            href="https://docs.zephix.io"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-z-text-secondary"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Help docs
          </a>
          <a
            href="mailto:support@zephix.io"
            className="inline-flex items-center gap-1 hover:text-z-text-secondary"
          >
            <Mail className="h-3.5 w-3.5" />
            Contact support
          </a>
        </div>

        <WorkspaceCreateModal
          open={showCreateWorkspace}
          onClose={() => setShowCreateWorkspace(false)}
          onCreated={() => {
            setShowCreateWorkspace(false);
            void queryClient.invalidateQueries({ queryKey: ["org-home-workspaces"] });
            void queryClient.invalidateQueries({ queryKey: ["org-onboarding-status"] });
          }}
        />
      </main>
    </div>
  );
}
