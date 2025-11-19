import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Grid, List } from "lucide-react";
import { api } from "@/lib/api";
import { DashboardCreateModal } from "@/features/dashboards/DashboardCreateModal";

interface Dashboard {
  id: string;
  name: string;
  visibility: string;
  scope: string;
  createdAt: string;
  updatedAt: string;
}

export function DashboardsIndex() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    loadDashboards();
  }, []);

  const loadDashboards = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/dashboards");
      setDashboards(response.data?.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load dashboards");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDashboard = () => {
    setShowCreateModal(true);
  };

  if (loading) {
    return (
      <div className="p-6" data-testid="dashboards-index">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6" data-testid="dashboards-index">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="dashboards-index">
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

      {dashboards.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
            <Grid className="w-full h-full" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No dashboards yet</h3>
          <p className="text-gray-600 mb-6">
            Create your first dashboard to get started with visualizing your data.
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
                    {dashboard.visibility === "private" ? "Private" : "Workspace"} • {dashboard.scope}
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
                      {dashboard.visibility === "private" ? "Private" : "Workspace"} • {dashboard.scope}
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

      <DashboardCreateModal 
        open={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
      />
    </div>
  );
}
