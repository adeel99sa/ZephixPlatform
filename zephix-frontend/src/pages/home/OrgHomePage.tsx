import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useOrgHomeState } from "@/features/organizations/useOrgHomeState";
import { skipOnboarding } from "@/features/organizations/onboarding.api";
import { useWorkspaceStore } from "@/state/workspace.store";
import { useAuth } from "@/state/AuthContext";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { listWorkspaces, type Workspace } from "@/features/workspaces/api";
import { WorkspaceCreateModal } from "@/features/workspaces/WorkspaceCreateModal";
import { track } from "@/lib/telemetry";
import {
  Briefcase,
  Users,
  Settings,
  SkipForward,
  FolderOpen,
  Search,
  ArrowRight,
  Clock,
  UserPlus,
  Mail,
  HelpCircle,
  LayoutDashboard,
  ListChecks,
  Inbox,
  CreditCard,
  BookOpen,
  Layers,
} from "lucide-react";

/* ================================================================ */
/*  Small UI primitives                                              */
/* ================================================================ */

function SectionHeading(p: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
        {p.title}
      </h2>
      {p.subtitle && (
        <p className="text-xs text-gray-400 mt-0.5">{p.subtitle}</p>
      )}
    </div>
  );
}

function Btn(p: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  small?: boolean;
}) {
  const v = p.variant ?? "primary";
  const base = `inline-flex items-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${
    p.small ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
  }`;
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    secondary: "bg-gray-900 text-white hover:bg-gray-800",
    ghost:
      "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
  };
  return (
    <button
      className={`${base} ${variants[v]}`}
      onClick={p.onClick}
      disabled={p.disabled}
    >
      {p.children}
    </button>
  );
}

function Card(p: {
  icon?: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${
        p.muted ? "border-gray-100 opacity-80" : "border-gray-200"
      }`}
    >
      <div className="flex items-start gap-3">
        {p.icon && (
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
            {p.icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 mb-0.5">{p.title}</h3>
          <p className="text-xs text-gray-500 leading-relaxed mb-3">{p.body}</p>
          {p.action}
        </div>
      </div>
    </div>
  );
}

/* ================================================================ */
/*  Explore tiles definition                                         */
/* ================================================================ */

interface ExploreTile {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  route: string;
  /** True = requires an active workspace to navigate */
  requiresWorkspace: boolean;
  /** Only show for admin role */
  adminOnly?: boolean;
}

const EXPLORE_TILES: ExploreTile[] = [
  {
    key: "templates",
    label: "Templates library",
    description: "Browse project templates to jumpstart your work",
    icon: <Layers className="h-5 w-5" />,
    color: "bg-violet-50 text-violet-600",
    route: "/templates",
    requiresWorkspace: true,
  },
  {
    key: "dashboards",
    label: "Dashboards",
    description: "Visual overviews of project progress and metrics",
    icon: <LayoutDashboard className="h-5 w-5" />,
    color: "bg-blue-50 text-blue-600",
    route: "/dashboards",
    requiresWorkspace: true,
  },
  {
    key: "my-work",
    label: "My work",
    description: "Your tasks and assignments — needs a workspace to populate",
    icon: <ListChecks className="h-5 w-5" />,
    color: "bg-emerald-50 text-emerald-600",
    route: "/projects",
    requiresWorkspace: true,
  },
  {
    key: "inbox",
    label: "Inbox",
    description: "Notifications and updates — needs a workspace to populate",
    icon: <Inbox className="h-5 w-5" />,
    color: "bg-amber-50 text-amber-600",
    route: "/notifications",
    requiresWorkspace: true,
  },
  {
    key: "help",
    label: "Help center",
    description: "Guides, docs, and answers to common questions",
    icon: <BookOpen className="h-5 w-5" />,
    color: "bg-gray-50 text-gray-600",
    route: "https://docs.zephix.io",
    requiresWorkspace: false,
  },
  {
    key: "billing",
    label: "Billing & plan",
    description: "Manage your subscription and payment details",
    icon: <CreditCard className="h-5 w-5" />,
    color: "bg-pink-50 text-pink-600",
    route: "/billing",
    requiresWorkspace: false,
    adminOnly: true,
  },
];

/* ================================================================ */
/*  Explore section component                                        */
/* ================================================================ */

function ExploreSection({
  isAdmin,
  hasWorkspace,
  onWorkspaceRequired,
}: {
  isAdmin: boolean;
  hasWorkspace: boolean;
  onWorkspaceRequired: (route: string) => void;
}) {
  const nav = useNavigate();

  const tiles = EXPLORE_TILES.filter((t) => !t.adminOnly || isAdmin);

  function handleTileClick(tile: ExploreTile) {
    track("explore_tile_clicked", { tileKey: tile.key, hasWorkspace });

    // External link (e.g. help docs)
    if (tile.route.startsWith("http")) {
      window.open(tile.route, "_blank", "noopener,noreferrer");
      return;
    }

    // Workspace-gated tile with no workspace
    if (tile.requiresWorkspace && !hasWorkspace) {
      track("explore_requires_workspace_clicked", { tileKey: tile.key });
      onWorkspaceRequired(tile.route);
      return;
    }

    nav(tile.route);
  }

  return (
    <div>
      <SectionHeading
        title="Explore Zephix"
        subtitle="Browse what your platform can do"
      />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {tiles.map((tile) => {
          const needsWs = tile.requiresWorkspace && !hasWorkspace;
          return (
            <button
              key={tile.key}
              onClick={() => handleTileClick(tile)}
              className="group rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm hover:shadow-md hover:border-indigo-200 transition-all"
            >
              <div
                className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg ${tile.color}`}
              >
                {tile.icon}
              </div>
              <div className="text-sm font-semibold text-gray-900 mb-0.5 group-hover:text-indigo-600 transition-colors">
                {tile.label}
              </div>
              <div className="text-xs text-gray-500 leading-relaxed">
                {tile.description}
              </div>
              {needsWs && (
                <span className="mt-2 inline-block text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                  Requires workspace
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================ */
/*  Workspace picker panel                                           */
/* ================================================================ */

function WorkspacePickerPanel({
  workspaces,
  isAdmin,
  onSelect,
  onCreateNew,
}: {
  workspaces: Workspace[];
  isAdmin: boolean;
  onSelect: (id: string) => void;
  onCreateNew: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = workspaces.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <SectionHeading title="Your workspaces" />
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search workspaces..."
          className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-gray-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map((w) => (
          <button
            key={w.id}
            onClick={() => onSelect(w.id)}
            className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm hover:shadow-md hover:border-indigo-200 transition-all"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-bold text-sm">
              {w.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                {w.name}
              </div>
              <div className="text-xs text-gray-400">
                {w.slug ?? "workspace"}
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-indigo-400 transition-colors" />
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-sm text-gray-400 py-4 text-center">
            {search ? "No workspaces match your search" : "No workspaces available"}
          </div>
        )}
      </div>
      {isAdmin && (
        <div className="mt-4">
          <Btn variant="ghost" small onClick={onCreateNew}>
            + Create workspace
          </Btn>
        </div>
      )}
    </div>
  );
}

/* ================================================================ */
/*  MAIN EXPORT: OrgHomePage                                         */
/* ================================================================ */

export default function OrgHomePage() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const {
    isLoading: orgLoading,
    workspaceCount,
    isAdmin,
    isMember,
    isViewer,
  } = useOrgHomeState();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);

  const [isSkipping, setIsSkipping] = useState(false);
  const [showCreateWs, setShowCreateWs] = useState(false);
  /** Route to navigate to after workspace creation (from explore tiles or ?next=) */
  const [pendingNextRoute, setPendingNextRoute] = useState<string | null>(null);

  // Pick up ?next= from RequireWorkspace redirect
  const nextFromQuery = searchParams.get("next");

  // Fetch workspace list when workspaces exist
  const wsQuery = useQuery({
    queryKey: ["workspaces-list-orgHome"],
    queryFn: listWorkspaces,
    enabled: workspaceCount > 0,
    staleTime: 30_000,
  });

  const workspaces = wsQuery.data ?? [];
  const hasWorkspace = Boolean(activeWorkspaceId);

  /* Telemetry: page view */
  useEffect(() => {
    track("activation_home_viewed", {
      organizationId: user?.organizationId,
      workspaceCount,
      isAdmin,
      isMember,
      isViewer,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const firstName = user?.firstName || user?.email?.split("@")[0] || "there";
  const activeWsName = workspaces.find((w) => w.id === activeWorkspaceId)?.name;

  /** Open workspace creation in activation mode (setup flow) */
  function startActivation() {
    track("start_setup_clicked", {});
    setPendingNextRoute(null);
    setShowCreateWs(true);
  }

  /** Open workspace creation to continue to a specific route */
  function openCreateForRoute(route: string) {
    setPendingNextRoute(route);
    setShowCreateWs(true);
  }

  /** Handle explore tile that requires workspace */
  function handleWorkspaceRequired(route: string) {
    if (hasWorkspace) {
      nav(route);
    } else {
      openCreateForRoute(route);
    }
  }

  /* ──── Loading skeleton ──────────────────────────────────────── */
  if (orgLoading) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto space-y-5">
          <div className="h-8 w-64 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-4 w-96 bg-gray-100 rounded animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  STATE: VIEWER / GUEST — minimal view                             */
  /* ================================================================ */
  if (isViewer) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Shared with you
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              You have view access. Items shared by your team will appear here.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card
              icon={<FolderOpen className="h-5 w-5" />}
              title="No shared items yet"
              body="Ask an admin to share a project or invite you to a workspace."
            />
            <Card
              icon={<Mail className="h-5 w-5" />}
              title="Have an invite link?"
              body="If someone shared a workspace invite link with you, paste it to join."
              action={
                <Btn variant="ghost" small onClick={() => nav("/join/workspace")}>
                  Enter invite link
                </Btn>
              }
            />
          </div>

          {/* Help only */}
          <div className="flex gap-4 text-xs text-gray-400">
            <a
              href="https://docs.zephix.io"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-600 flex items-center gap-1"
            >
              <HelpCircle className="h-3.5 w-3.5" /> Help docs
            </a>
          </div>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  MAIN STATE: Admin or Member — unified layout                     */
  /* ================================================================ */
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {workspaceCount > 0 ? `Welcome back, ${firstName}` : `Welcome to Zephix, ${firstName}`}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {workspaceCount > 0
              ? activeWorkspaceId
                ? "Your organization at a glance."
                : "Pick a workspace to continue, or explore below."
              : isAdmin
                ? "Create a workspace and your first project will be ready in minutes."
                : "An admin will set up your workspace. In the meantime, explore the platform."}
          </p>
        </div>

        {/* ── Continue in active workspace ── */}
        {activeWorkspaceId && workspaceCount > 0 && (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {activeWsName || "Your workspace"} is selected
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Pick up where you left off, or choose a different workspace below.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Btn onClick={() => nav(`/workspaces/${activeWorkspaceId}`)}>
                Continue <ArrowRight className="h-3.5 w-3.5" />
              </Btn>
            </div>
          </div>
        )}

        {/* ── MODE 1: Guided Setup — Admin, zero workspaces ── */}
        {workspaceCount === 0 && isAdmin && (
          <>
            <div className="rounded-xl border-2 border-indigo-200 bg-white p-8 shadow-sm text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <Briefcase className="h-7 w-7" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                Start your first workspace
              </h2>
              <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                Workspaces hold projects, tasks, and your team. Create one to begin — we'll help you pick a template next.
              </p>
              <Btn onClick={startActivation}>
                Create workspace <ArrowRight className="h-3.5 w-3.5" />
              </Btn>
            </div>

            {/* Secondary links */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => nav("/admin/invite")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <UserPlus className="h-3.5 w-3.5 text-gray-400" /> Invite team
              </button>
              <button
                onClick={() => nav("/admin/org")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Settings className="h-3.5 w-3.5 text-gray-400" /> Org settings
              </button>
              <button
                onClick={async () => {
                  track("activation_skip_clicked", { organizationId: user?.organizationId });
                  setIsSkipping(true);
                  try {
                    await skipOnboarding();
                    queryClient.invalidateQueries({
                      queryKey: ["org-onboarding-status"],
                    });
                  } finally {
                    setIsSkipping(false);
                  }
                }}
                disabled={isSkipping}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <SkipForward className="h-3.5 w-3.5 text-gray-400" />
                {isSkipping ? "Skipping..." : "Skip setup"}
              </button>
            </div>
          </>
        )}

        {/* ── Member, zero workspaces — Waiting card ── */}
        {workspaceCount === 0 && isMember && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card
              icon={<Clock className="h-5 w-5" />}
              title="Waiting for workspace setup"
              body="Once a workspace is created and you're added, it will appear here automatically."
            />
            <Card
              icon={<Mail className="h-5 w-5" />}
              title="Contact your admin"
              body="Ask an admin to invite you to a workspace or check your email for an invite link."
              action={
                <Btn variant="ghost" small onClick={() => nav("/admin/invite")}>
                  View pending invites
                </Btn>
              }
            />
          </div>
        )}

        {/* ── Workspace picker (State 2) ── */}
        {workspaceCount > 0 && (
          <WorkspacePickerPanel
            workspaces={workspaces}
            isAdmin={isAdmin}
            onSelect={(id) => {
              setActiveWorkspace(id);
              // If there's a pending next route from ?next= param, go there
              if (nextFromQuery) {
                nav(decodeURIComponent(nextFromQuery), { replace: true });
              } else {
                nav(`/workspaces/${id}`, { replace: true });
              }
            }}
            onCreateNew={startActivation}
          />
        )}

        {/* ── MODE 2: Explore Zephix — always visible for Admin & Member ── */}
        <ExploreSection
          isAdmin={isAdmin}
          hasWorkspace={hasWorkspace}
          onWorkspaceRequired={handleWorkspaceRequired}
        />

        {/* ── Help links ── */}
        <div className="flex gap-4 text-xs text-gray-400">
          <a
            href="https://docs.zephix.io"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-600 flex items-center gap-1"
          >
            <HelpCircle className="h-3.5 w-3.5" /> Help docs
          </a>
          <a
            href="mailto:support@zephix.io"
            className="hover:text-gray-600 flex items-center gap-1"
          >
            <Mail className="h-3.5 w-3.5" /> Contact support
          </a>
        </div>

        {/* ── Workspace creation modal ── */}
        <WorkspaceCreateModal
          open={showCreateWs}
          onClose={() => {
            setShowCreateWs(false);
            setPendingNextRoute(null);
          }}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ["org-onboarding-status"] });
            queryClient.invalidateQueries({ queryKey: ["workspaces-list-orgHome"] });
          }}
          activationMode={!pendingNextRoute}
          nextRoute={pendingNextRoute}
        />
      </div>
    </div>
  );
}
