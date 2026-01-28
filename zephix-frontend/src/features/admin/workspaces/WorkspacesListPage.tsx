import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { workspacesApi, type Workspace } from "./workspaces.api";
import { track } from "@/lib/telemetry";
import CreateWorkspaceModal from "./CreateWorkspaceModal";
import { FolderKanban, Search, Plus, Edit, Eye } from "lucide-react";
import { useWorkspaceStore } from "@/state/workspace.store";
import { openWorkspaceSettingsModal } from "@/features/workspaces/components/WorkspaceSettingsModal/controller";
import { useAuth } from "@/state/AuthContext";

export default function WorkspacesListPage() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { setActiveWorkspace } = useWorkspaceStore();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);

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

    track("admin.workspaces.viewed");
    loadWorkspaces();
  }, [authLoading, user, searchTerm, statusFilter]);

  const loadWorkspaces = async () => {
    try {
      setLoading(true);
      const params: { search?: string; status?: string } = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== "all") params.status = statusFilter;
      const data = await workspacesApi.getWorkspaces(params);
      setWorkspaces(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load workspaces:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenWorkspace = (workspaceId: string) => {
    setActiveWorkspace(workspaceId);
    track("admin.workspaces.opened", { workspaceId });
    navigate(`/workspaces/${workspaceId}`);
  };

  const handleEditWorkspace = (workspaceId: string) => {
    track("admin.workspaces.edit_opened", { workspaceId, source: "admin" });
    openWorkspaceSettingsModal(workspaceId);
  };

  const filteredWorkspaces = workspaces.filter((ws) => {
    const matchesSearch =
      !searchTerm ||
      ws.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ws.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || ws.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6" data-testid="admin-workspaces-root">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Workspaces</h1>
          <p className="text-sm text-gray-500 mt-1">
            View and manage all workspaces in your organization
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          data-testid="create-workspace-button"
        >
          <Plus className="h-4 w-4" />
          Create Workspace
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search workspaces..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Workspaces List */}
      {loading ? (
        <div className="text-gray-500">Loading workspaces...</div>
      ) : filteredWorkspaces.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <FolderKanban className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500 mb-2">No workspaces found</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="text-blue-600 hover:text-blue-700"
          >
            Create your first workspace →
          </button>
        </div>
      ) : (
        <div
          className="bg-white rounded-lg border border-gray-200 overflow-hidden"
          data-testid="admin-workspaces-table"
        >
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Visibility
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredWorkspaces.map((workspace) => (
                <tr key={workspace.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{workspace.name}</div>
                    {workspace.description && (
                      <div className="text-sm text-gray-500 mt-1">{workspace.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {workspace.owner?.name || workspace.owner?.email || "No owner"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        workspace.visibility === "public"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {workspace.visibility}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        workspace.status === "active"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {workspace.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {workspace.createdAt
                      ? new Date(workspace.createdAt).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenWorkspace(workspace.id)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Open workspace"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEditWorkspace(workspace.id)}
                        className="text-gray-600 hover:text-gray-900"
                        title="Edit workspace"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <CreateWorkspaceModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadWorkspaces();
          }}
        />
      )}
    </div>
  );
}

