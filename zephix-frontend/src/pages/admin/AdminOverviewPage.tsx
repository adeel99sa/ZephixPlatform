import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { track } from "@/lib/telemetry";
import { api } from "@/lib/api";
import { useAuth } from "@/state/AuthContext";

interface OrgSummary {
  name: string;
  id: string;
  slug?: string;
  totalUsers: number;
  totalWorkspaces: number;
}

interface UserSummary {
  total: number;
  byRole: {
    owners: number;
    admins: number;
    members: number;
    viewers: number;
  };
}

interface WorkspaceSummary {
  total: number;
  byType: {
    public: number;
    private: number;
  };
  byStatus: {
    active: number;
    archived: number;
  };
}

interface RiskSummary {
  projectsAtRisk: number;
  overallocatedResources: number;
}

export default function AdminOverviewPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [orgSummary, setOrgSummary] = useState<OrgSummary | null>(null);
  const [userSummary, setUserSummary] = useState<UserSummary | null>(null);
  const [workspaceSummary, setWorkspaceSummary] = useState<WorkspaceSummary | null>(null);
  const [riskSummary, setRiskSummary] = useState<RiskSummary | null>(null);
  const [loading, setLoading] = useState(true);

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

    track("admin.overview.viewed");
    loadData();
  }, [authLoading, user]);

  async function loadData() {
    try {
      setLoading(true);
      // Load all summaries in parallel
      const [org, users, workspaces, risk] = await Promise.all([
        loadOrgSummary(),
        loadUserSummary(),
        loadWorkspaceSummary(),
        loadRiskSummary(),
      ]);
      setOrgSummary(org);
      setUserSummary(users);
      setWorkspaceSummary(workspaces);
      setRiskSummary(risk);
    } catch (error) {
      console.error("Failed to load admin overview:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadOrgSummary(): Promise<OrgSummary> {
    try {
      const response = await api.get<{ data: OrgSummary }>("/admin/org/summary");
      // Backend returns { data: OrgSummary }
      return response?.data || response;
    } catch (error) {
      // Fallback if endpoint doesn't exist yet
      return {
        name: "Organization",
        id: "unknown",
        totalUsers: 0,
        totalWorkspaces: 0,
      };
    }
  }

  async function loadUserSummary(): Promise<UserSummary> {
    try {
      const response = await api.get<{ data: UserSummary }>("/admin/users/summary");
      // Backend returns { data: UserSummary }
      return response?.data || response;
    } catch (error) {
      // Fallback
      return {
        total: 0,
        byRole: {
          owners: 0,
          admins: 0,
          members: 0,
          viewers: 0,
        },
      };
    }
  }

  async function loadWorkspaceSummary(): Promise<WorkspaceSummary> {
    try {
      const response = await api.get<{ data: WorkspaceSummary }>("/admin/workspaces/summary");
      // Backend returns { data: WorkspaceSummary }
      return response?.data || response;
    } catch (error) {
      // Fallback
      return {
        total: 0,
        byType: {
          public: 0,
          private: 0,
        },
        byStatus: {
          active: 0,
          archived: 0,
        },
      };
    }
  }

  async function loadRiskSummary(): Promise<RiskSummary> {
    try {
      const response = await api.get<{ data: RiskSummary }>("/admin/risk/summary");
      // Backend returns { data: RiskSummary }
      return response?.data || response;
    } catch (error) {
      // Fallback
      return {
        projectsAtRisk: 0,
        overallocatedResources: 0,
      };
    }
  }

  if (loading) {
    return (
      <div className="p-6" data-testid="admin-overview-root">
        <div className="text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="admin-overview-root">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Admin overview</h1>
        <p className="text-sm text-gray-500 mt-1">Organization-wide statistics and management</p>
      </div>

      {/* Org Summary Card */}
      <div className="rounded-xl border p-4" data-testid="admin-org-summary">
        <h2 className="font-medium text-gray-900 mb-3">Organization</h2>
        <div className="space-y-2">
          <div>
            <div className="text-sm text-gray-500">Name</div>
            <div className="text-lg font-semibold">{orgSummary?.name || "Unknown"}</div>
          </div>
          {orgSummary?.slug && (
            <div>
              <div className="text-sm text-gray-500">Slug</div>
              <div className="text-sm font-mono">{orgSummary.slug}</div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <div className="text-sm text-gray-500">Total Users</div>
              <div className="text-2xl font-semibold">{orgSummary?.totalUsers || 0}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Total Workspaces</div>
              <div className="text-2xl font-semibold">{orgSummary?.totalWorkspaces || 0}</div>
            </div>
          </div>
        </div>
      </div>

      {/* User Summary Card */}
      <div className="rounded-xl border p-4" data-testid="admin-user-summary">
        <h2 className="font-medium text-gray-900 mb-3">Users</h2>
        <div className="space-y-2">
          <div>
            <div className="text-sm text-gray-500">Total Users</div>
            <div className="text-2xl font-semibold">{userSummary?.total || 0}</div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <div className="text-sm text-gray-500">Owners</div>
              <div className="text-xl font-semibold">{userSummary?.byRole.owners || 0}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Admins</div>
              <div className="text-xl font-semibold">{userSummary?.byRole.admins || 0}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Members</div>
              <div className="text-xl font-semibold">{userSummary?.byRole.members || 0}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Viewers</div>
              <div className="text-xl font-semibold">{userSummary?.byRole.viewers || 0}</div>
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={() => {
                track("admin.users.viewed", { source: "overview" });
                navigate("/admin/users");
              }}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Manage users →
            </button>
          </div>
        </div>
      </div>

      {/* Workspaces Summary Card */}
      <div className="rounded-xl border p-4" data-testid="admin-workspace-summary">
        <h2 className="font-medium text-gray-900 mb-3">Workspaces</h2>
        <div className="space-y-2">
          <div>
            <div className="text-sm text-gray-500">Total Workspaces</div>
            <div className="text-2xl font-semibold">{workspaceSummary?.total || 0}</div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <div className="text-sm text-gray-500">By Type</div>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm">Public</span>
                  <span className="text-sm font-semibold">{workspaceSummary?.byType.public || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Private</span>
                  <span className="text-sm font-semibold">{workspaceSummary?.byType.private || 0}</span>
                </div>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">By Status</div>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm">Active</span>
                  <span className="text-sm font-semibold">{workspaceSummary?.byStatus.active || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Archived</span>
                  <span className="text-sm font-semibold">{workspaceSummary?.byStatus.archived || 0}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={() => {
                track("admin.workspaces.viewed", { source: "overview" });
                navigate("/admin/workspaces");
              }}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Manage workspaces →
            </button>
          </div>
        </div>
      </div>

      {/* Risk Summary Card */}
      <div className="rounded-xl border p-4" data-testid="admin-risk-summary">
        <h2 className="font-medium text-gray-900 mb-3">Risk & Alerts</h2>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-500">Projects at Risk</div>
              <div className="text-2xl font-semibold">{riskSummary?.projectsAtRisk || 0}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Over-allocated Resources</div>
              <div className="text-2xl font-semibold">{riskSummary?.overallocatedResources || 0}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}














