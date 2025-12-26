import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { track } from "@/lib/telemetry";
import { adminOverviewApi, type AdminSummary } from "./AdminOverview.api";
import { Users, FolderKanban, AlertTriangle, TrendingUp } from "lucide-react";

export default function AdminOverviewPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    track("admin.overview.viewed");
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const data = await adminOverviewApi.getSummary();
      setSummary(data);
    } catch (error) {
      console.error("Failed to load admin overview:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6" data-testid="admin-overview-root">
        <div className="text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="p-6" data-testid="admin-overview-root">
        <div className="text-center text-red-500">Failed to load data</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="admin-overview-root">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Admin Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Organization-wide statistics and management</p>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users Card */}
        <div className="rounded-lg border border-gray-200 bg-white p-6" data-testid="admin-summary-card-users">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">{summary.users.total}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                track("admin.users.viewed", { source: "overview" });
                navigate("/admin/users");
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Manage users →
            </button>
          </div>
        </div>

        {/* Active Users Card */}
        <div className="rounded-lg border border-gray-200 bg-white p-6" data-testid="admin-summary-card-active-users">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">
                {summary.users.byRole.owners + summary.users.byRole.admins + summary.users.byRole.members}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              {summary.users.byRole.owners} owners, {summary.users.byRole.admins} admins
            </p>
          </div>
        </div>

        {/* Total Workspaces Card */}
        <div className="rounded-lg border border-gray-200 bg-white p-6" data-testid="admin-summary-card-workspaces">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Workspaces</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">{summary.workspaces.total}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
              <FolderKanban className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                track("admin.workspaces.viewed", { source: "overview" });
                navigate("/admin/workspaces");
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Manage workspaces →
            </button>
          </div>
        </div>

        {/* Active Projects Card */}
        <div className="rounded-lg border border-gray-200 bg-white p-6" data-testid="admin-summary-card-projects">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Projects</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">
                {/* TODO: Add active projects count from API */}
                0
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
              <FolderKanban className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">TODO: Connect to projects API</p>
          </div>
        </div>
      </div>

      {/* Detailed Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Organization Summary */}
        <div className="rounded-lg border border-gray-200 bg-white p-6" data-testid="admin-org-summary">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Organization</h2>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-500">Name</div>
              <div className="text-lg font-semibold text-gray-900 mt-1">{summary.org.name}</div>
            </div>
            {summary.org.slug && (
              <div>
                <div className="text-sm text-gray-500">Slug</div>
                <div className="text-sm font-mono text-gray-700 mt-1">{summary.org.slug}</div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div>
                <div className="text-sm text-gray-500">Total Users</div>
                <div className="text-2xl font-semibold text-gray-900 mt-1">{summary.org.totalUsers}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Total Workspaces</div>
                <div className="text-2xl font-semibold text-gray-900 mt-1">{summary.org.totalWorkspaces}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Users by Role */}
        <div className="rounded-lg border border-gray-200 bg-white p-6" data-testid="admin-user-summary">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Users by Role</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Owners</span>
              <span className="text-lg font-semibold text-gray-900">{summary.users.byRole.owners}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Admins</span>
              <span className="text-lg font-semibold text-gray-900">{summary.users.byRole.admins}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Members</span>
              <span className="text-lg font-semibold text-gray-900">{summary.users.byRole.members}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Viewers</span>
              <span className="text-lg font-semibold text-gray-900">{summary.users.byRole.viewers}</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                track("admin.users.viewed", { source: "overview" });
                navigate("/admin/users");
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all users →
            </button>
          </div>
        </div>

        {/* Workspaces Summary */}
        <div className="rounded-lg border border-gray-200 bg-white p-6" data-testid="admin-workspace-summary">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Workspaces</h2>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-500 mb-2">By Type</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Public</span>
                  <span className="text-lg font-semibold text-gray-900">{summary.workspaces.byType.public}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Private</span>
                  <span className="text-lg font-semibold text-gray-900">{summary.workspaces.byType.private}</span>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-500 mb-2">By Status</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Active</span>
                  <span className="text-lg font-semibold text-gray-900">{summary.workspaces.byStatus.active}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Archived</span>
                  <span className="text-lg font-semibold text-gray-900">{summary.workspaces.byStatus.archived}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                track("admin.workspaces.viewed", { source: "overview" });
                navigate("/admin/workspaces");
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Manage workspaces →
            </button>
          </div>
        </div>

        {/* Risk & Alerts */}
        <div className="rounded-lg border border-gray-200 bg-white p-6" data-testid="admin-risk-summary">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Risk & Alerts</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="text-sm font-medium text-gray-700">Projects at Risk</span>
              </div>
              <span className="text-2xl font-semibold text-red-600">{summary.risk.projectsAtRisk}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <span className="text-sm font-medium text-gray-700">Over-allocated Resources</span>
              </div>
              <span className="text-2xl font-semibold text-orange-600">{summary.risk.overallocatedResources}</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">TODO: Add charts and detailed risk analysis</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border border-gray-200 bg-white p-6" data-testid="admin-quick-actions">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => {
              track("admin.users.create", { source: "overview" });
              // TODO: Open create user modal
              navigate("/admin/users");
            }}
            className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-left"
            data-testid="quick-action-create-user"
          >
            <div className="font-medium text-gray-900">Create User</div>
            <div className="text-sm text-gray-500 mt-1">Add a new user to the organization</div>
          </button>
          <button
            onClick={() => {
              track("admin.workspaces.create", { source: "overview" });
              // TODO: Open create workspace modal
              navigate("/admin/workspaces");
            }}
            className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-left"
            data-testid="quick-action-create-workspace"
          >
            <div className="font-medium text-gray-900">Create Workspace</div>
            <div className="text-sm text-gray-500 mt-1">Create a new workspace</div>
          </button>
          <button
            onClick={() => {
              track("admin.groups.create", { source: "overview" });
              // TODO: Open create group modal
              navigate("/admin/groups");
            }}
            className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-left"
            data-testid="quick-action-create-group"
          >
            <div className="font-medium text-gray-900">Create Group</div>
            <div className="text-sm text-gray-500 mt-1">Create a new user group</div>
          </button>
        </div>
      </div>
    </div>
  );
}















