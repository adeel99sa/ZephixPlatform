// Phase 4.3: Dashboards Index with Template Gallery
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Grid, List, Search, Sparkles, AlertCircle } from "lucide-react";
import { DashboardCreateModal } from "@/features/dashboards/DashboardCreateModal";
import { listDashboards, listTemplates, activateTemplate } from "@/features/dashboards/api";
import { WorkspaceRequiredError } from "@/features/dashboards/schemas";
import type { DashboardEntity, DashboardTemplate } from "@/features/dashboards/types";
import { useWorkspaceStore } from "@/state/workspace.store";

export function DashboardsIndex() {
  const navigate = useNavigate();
  const { activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();

  const [dashboards, setDashboards] = useState<DashboardEntity[]>([]);
  const [templates, setTemplates] = useState<DashboardTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workspaceError, setWorkspaceError] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [activatingTemplate, setActivatingTemplate] = useState<string | null>(null);

  useEffect(() => {
    loadDashboards();
    loadTemplates();
  }, []);

  const loadDashboards = async () => {
    try {
      setLoading(true);
      setError(null);
      setWorkspaceError(false);
      const data = await listDashboards();
      setDashboards(data);
    } catch (err: any) {
      if (err instanceof WorkspaceRequiredError) {
        setWorkspaceError(true);
        setError("Please select a workspace to view dashboards.");
      } else {
        const requestId = err?.response?.headers?.['x-request-id'];
        setError(err?.response?.data?.message || `Failed to load dashboards${requestId ? ` (RequestId: ${requestId})` : ''}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      setTemplatesLoading(true);
      const data = await listTemplates();
      setTemplates(data);
    } catch (err: any) {
      if (err instanceof WorkspaceRequiredError) {
        setWorkspaceError(true);
      } else {
        console.error("Failed to load templates:", err);
      }
    } finally {
      setTemplatesLoading(false);
    }
  };

  const handleActivateTemplate = async (templateKey: string) => {
    try {
      setActivatingTemplate(templateKey);
      setError(null);
      const dashboard = await activateTemplate(templateKey);
      // Navigate to builder
      navigate(`/dashboards/${dashboard.id}/edit`);
    } catch (err: any) {
      if (err instanceof WorkspaceRequiredError) {
        setWorkspaceError(true);
        setError("Please select a workspace to activate templates.");
      } else {
        const requestId = err?.response?.headers?.['x-request-id'];
        setError(err?.response?.data?.message || `Failed to activate template${requestId ? ` (RequestId: ${requestId})` : ''}`);
      }
    } finally {
      setActivatingTemplate(null);
    }
  };

  const handleCreateDashboard = () => {
    setShowCreateModal(true);
  };

  // Filter templates by search query
  const filteredTemplates = templates.filter((template) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      template.name.toLowerCase().includes(query) ||
      template.key.toLowerCase().includes(query) ||
      template.persona?.toLowerCase().includes(query) ||
      template.methodology?.toLowerCase().includes(query) ||
      template.description?.toLowerCase().includes(query)
    );
  });

  // Workspace required error handler
  if (workspaceError) {
    return (
      <div className="p-6" data-testid="dashboards-index">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
            <div>
              <p className="text-yellow-800 font-medium">Workspace Required</p>
              <p className="text-yellow-700 text-sm mt-1">
                Please select a workspace from the sidebar to view and create dashboards.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="dashboards-index">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboards</h1>
          <p className="text-gray-600 mt-1">
            {dashboards.length === 0
              ? "No dashboards yet"
              : `${dashboards.length} dashboard${dashboards.length === 1 ? '' : 's'}`
            }
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center border border-gray-300 rounded-md">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 ${viewMode === "grid" ? "bg-gray-100" : "hover:bg-gray-50"}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 ${viewMode === "list" ? "bg-gray-100" : "hover:bg-gray-50"}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleCreateDashboard}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            data-testid="create-dashboard-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Dashboard
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Templates Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Sparkles className="w-5 h-5 text-indigo-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Templates</h2>
          </div>
          {/* Search */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {templatesLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchQuery ? "No templates match your search." : "No templates available."}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => {
              const widgetCount = template.definition?.widgets?.length || 0;
              const isActivating = activatingTemplate === template.key;

              return (
                <div
                  key={template.id}
                  className="bg-white rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors p-6"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h3>
                  {template.description && (
                    <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                    <span>{template.persona}</span>
                    {template.methodology && <span>{template.methodology}</span>}
                  </div>
                  <div className="text-sm text-gray-600 mb-4">
                    Includes: {widgetCount} widget{widgetCount !== 1 ? 's' : ''}
                  </div>
                  <button
                    onClick={() => handleActivateTemplate(template.key)}
                    disabled={isActivating}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid={`activate-template-${template.key}`}
                  >
                    {isActivating ? "Activating..." : "Activate"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Your Dashboards Section */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Dashboards</h2>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : dashboards.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
              <Grid className="w-full h-full" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No dashboards yet</h3>
            <p className="text-gray-600 mb-6">
              Activate a template above or create a custom dashboard to get started.
            </p>
            <button
              onClick={handleCreateDashboard}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Dashboard
            </button>
          </div>
        ) : (
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
          {dashboards.map((dashboard) => (
            <div
              key={dashboard.id}
              className={`bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors ${
                viewMode === "list" ? "p-4 flex items-center justify-between" : "p-6"
              }`}
            >
              {viewMode === "grid" ? (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    <Link
                      to={`/dashboards/${dashboard.id}`}
                      className="hover:text-indigo-600"
                    >
                      {dashboard.name}
                    </Link>
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {dashboard.visibility === "PRIVATE" ? "Private" : dashboard.visibility === "ORG" ? "Organization" : "Workspace"}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      Updated {new Date(dashboard.updatedAt).toLocaleDateString()}
                    </span>
                    <Link
                      to={`/dashboards/${dashboard.id}/edit`}
                      className="text-sm text-indigo-600 hover:text-indigo-700"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      <Link
                        to={`/dashboards/${dashboard.id}`}
                        className="hover:text-indigo-600"
                      >
                        {dashboard.name}
                      </Link>
                    </h3>
                    <p className="text-sm text-gray-600">
                      {dashboard.visibility === "PRIVATE" ? "Private" : dashboard.visibility === "ORG" ? "Organization" : "Workspace"}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-500">
                      Updated {new Date(dashboard.updatedAt).toLocaleDateString()}
                    </span>
                    <Link
                      to={`/dashboards/${dashboard.id}/edit`}
                      className="text-sm text-indigo-600 hover:text-indigo-700"
                    >
                      Edit
                    </Link>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        )}
      </div>

      <DashboardCreateModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
