import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Save,
  Plus,
  Filter,
  MoreHorizontal,
  BarChart3,
  TrendingUp,
  Table,
  FileText,
  X,
  Copy,
  Trash2
} from "lucide-react";
import { api } from "@/lib/api";
import { duplicateDashboard, deleteDashboard, fetchDashboard } from "@/features/dashboards/api";
import { WidgetRenderer } from "@/features/dashboards/widgets/WidgetRenderer";
import { useAutosave } from "@/features/dashboards/useAutosave";
import { track } from "@/lib/telemetry";
import { hasFlag } from "@/lib/flags";

interface Widget {
  id: string;
  type: 'kpi' | 'trend' | 'table' | 'note';
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  data?: any;
}

interface Dashboard {
  id: string;
  name: string;
  widgets: Widget[];
}

export function DashboardBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWidgetLibrary, setShowWidgetLibrary] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Autosave integration
  const { save: autosave, status: autosaveStatus, setEtag } = useAutosave(dashboard?.id || '');

  useEffect(() => {
    if (dashboard) {
      autosave(dashboard); // Trigger autosave when dashboard changes
    }
  }, [dashboard?.widgets, dashboard?.filters, autosave]);

  useEffect(() => {
    if (id) {
      loadDashboard();
    }
  }, [id]);

  const loadDashboard = async (forceReload = false) => {
    try {
      setLoading(true);
      const item = await fetchDashboard(id!);
      setDashboard(item || { id: id!, name: "New Dashboard", widgets: [] });
      // Set ETag from response headers if available
      // setEtag(response.headers?.etag);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const reloadFromServer = async () => {
    await loadDashboard(true);
  };

  const saveDashboard = async () => {
    if (!dashboard) return;

    try {
      setSaving(true);
      await api.patch(`/api/dashboards/${id}`, {
        name: dashboard.name,
        widgets: dashboard.widgets,
      }, {
        headers: {
          "Idempotency-Key": crypto.randomUUID(),
        },
      });
      // Show success toast (placeholder)
      console.log("Dashboard saved successfully");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to save dashboard");
    } finally {
      setSaving(false);
    }
  };

  const addWidget = (type: Widget['type']) => {
    if (!dashboard) return;

    const newWidget: Widget = {
      id: crypto.randomUUID(),
      type,
      title: getWidgetTitle(type),
      x: 0,
      y: dashboard.widgets.length * 2,
      width: type === 'kpi' ? 1 : 2,
      height: type === 'kpi' ? 1 : 2,
    };

    setDashboard({
      ...dashboard,
      widgets: [...dashboard.widgets, newWidget],
    });
    setShowWidgetLibrary(false);
  };

  const removeWidget = (widgetId: string) => {
    if (!dashboard) return;

    setDashboard({
      ...dashboard,
      widgets: dashboard.widgets.filter(w => w.id !== widgetId),
    });
  };

  const getWidgetTitle = (type: Widget['type']): string => {
    switch (type) {
      case 'kpi': return 'KPI Widget';
      case 'trend': return 'Trend Chart';
      case 'table': return 'Data Table';
      case 'note': return 'Note';
      default: return 'Widget';
    }
  };

  const getWidgetIcon = (type: Widget['type']) => {
    switch (type) {
      case 'kpi': return <BarChart3 className="w-4 h-4" />;
      case 'trend': return <TrendingUp className="w-4 h-4" />;
      case 'table': return <Table className="w-4 h-4" />;
      case 'note': return <FileText className="w-4 h-4" />;
      default: return <BarChart3 className="w-4 h-4" />;
    }
  };

  const handleDuplicate = async () => {
    if (!dashboard?.id) return;
    try {
      const dup = await duplicateDashboard(dashboard.id);
      navigate(`/dashboards/${dup.id}/edit`);
      track("ui.db.duplicate", { source: dashboard.id, new: dup.id });
      setShowMoreMenu(false);
    } catch (error) {
      console.error('Failed to duplicate dashboard:', error);
    }
  };

  const handleDelete = async () => {
    if (!dashboard?.id) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!dashboard?.id) return;
    try {
      await deleteDashboard(dashboard.id);
      track("ui.db.delete.success", { id: dashboard.id });
      // toast.success("Dashboard moved to trash.");
      navigate("/dashboards");
    } catch (error) {
      track("ui.db.delete.error", { id: dashboard.id });
      // toast.error("Delete failed. Try again.");
      console.error('Failed to delete dashboard:', error);
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6" data-testid="dashboard-builder">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6" data-testid="dashboard-builder">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="dashboard-builder">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6" data-testid="builder-toolbar">
        <div className="flex items-center space-x-4">
          <button
            data-testid="dashboard-toolbar-edit"
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Edit Mode
          </button>

          <button
            data-testid="dashboard-toolbar-add"
            onClick={() => setShowWidgetLibrary(true)}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Widget
          </button>

          <button
            data-testid="dashboard-toolbar-filters"
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>
        </div>

        <div className="flex items-center space-x-3">
          {/* Autosave status */}
          <div className="text-sm text-gray-500">
            {autosaveStatus === "saving" ? "Saving…" :
             autosaveStatus === "saved" ? "All changes saved" :
             autosaveStatus === "conflict" ? (
               hasFlag("FF_AUTOSAVE_CONFLICT_UI") ? (
                 <span className="text-amber-600" data-testid="autosave-conflict">
                   Update conflict. <button className="underline" onClick={reloadFromServer}>Reload</button>
                 </span>
               ) : (
                 <span className="text-amber-600">Update conflict</span>
               )
             ) :
             autosaveStatus === "error" ? "Save failed" : "All changes saved"}
          </div>

          <button
            data-testid="dashboard-toolbar-save"
            onClick={saveDashboard}
            disabled={autosaveStatus === "saving"}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2" />
            {autosaveStatus === "saving" ? "Saving..." : "Save"}
          </button>

          <div className="relative">
            <button
              data-testid="dashboard-toolbar-more"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {showMoreMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                <div className="py-1">
                  {hasFlag("FF_DASHBOARD_DUPLICATE") && (
                    <button
                      onClick={handleDuplicate}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      data-testid="action-duplicate"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Duplicate
                    </button>
                  )}
                  {hasFlag("FF_DASHBOARD_DELETE") && (
                    <button
                      onClick={handleDelete}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      data-testid="action-delete"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Widget Library Modal */}
      {showWidgetLibrary && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setShowWidgetLibrary(false)} />

            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Add Widget</h3>
                <button
                  onClick={() => setShowWidgetLibrary(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  data-testid="builder-add-widget-kpi"
                  onClick={() => addWidget('kpi')}
                  className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 text-left"
                >
                  <BarChart3 className="w-6 h-6 text-indigo-600 mb-2" />
                  <div className="font-medium text-gray-900">KPI</div>
                  <div className="text-sm text-gray-600">Key performance indicators</div>
                </button>

                <button
                  data-testid="builder-add-widget-trend"
                  onClick={() => addWidget('trend')}
                  className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 text-left"
                >
                  <TrendingUp className="w-6 h-6 text-indigo-600 mb-2" />
                  <div className="font-medium text-gray-900">Trend Chart</div>
                  <div className="text-sm text-gray-600">Time series visualization</div>
                </button>

                <button
                  data-testid="builder-add-widget-table"
                  onClick={() => addWidget('table')}
                  className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 text-left"
                >
                  <Table className="w-6 h-6 text-indigo-600 mb-2" />
                  <div className="font-medium text-gray-900">Table</div>
                  <div className="text-sm text-gray-600">Data table view</div>
                </button>

                <button
                  data-testid="builder-add-widget-note"
                  onClick={() => addWidget('note')}
                  className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 text-left"
                >
                  <FileText className="w-6 h-6 text-indigo-600 mb-2" />
                  <div className="font-medium text-gray-900">Note</div>
                  <div className="text-sm text-gray-600">Text and annotations</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Grid */}
      <div className="grid grid-cols-12 gap-4" style={{ minHeight: '600px' }}>
        {dashboard?.widgets.map((widget) => (
          <div
            key={widget.id}
            className={`bg-white border border-gray-200 rounded-lg p-4 relative group ${
              widget.width === 1 ? 'col-span-3' :
              widget.width === 2 ? 'col-span-6' :
              'col-span-12'
            } ${widget.height === 1 ? 'h-32' : 'h-64'}`}
          >
            {/* Widget Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                {getWidgetIcon(widget.type)}
                <h4 className="font-medium text-gray-900">{widget.title}</h4>
              </div>
              <button
                onClick={() => removeWidget(widget.id)}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Widget Content */}
            <div className="text-sm text-gray-600">
              <WidgetRenderer
                widget={{
                  id: widget.id,
                  type: widget.type,
                  label: widget.config?.label || widget.title,
                  value: '—', // Default value, actual data comes from data prop
                  trend: 'flat',
                  text: widget.config?.text || '',
                  columns: widget.config?.columns || [],
                  rows: [],
                }}
                data={widget.data}
              />
            </div>
          </div>
        ))}

        {dashboard?.widgets.length === 0 && (
          <div className="col-span-12 text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
              <BarChart3 className="w-full h-full" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No widgets yet</h3>
            <p className="text-gray-600 mb-6">
              Add widgets to start building your dashboard.
            </p>
            <button
              onClick={() => setShowWidgetLibrary(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Widget
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setShowDeleteConfirm(false)} />

            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Delete Dashboard</h3>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-600">
                  Are you sure you want to move this dashboard to Trash? This action can be undone from the Admin section.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                  data-testid="delete-confirm-ok"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
