// Phase 4.3: Dashboard Builder with react-grid-layout
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Save, Plus, Eye, Undo2, Redo2, X, Copy, Trash2, MoreHorizontal, Sparkles } from "lucide-react";
import GridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import { fetchDashboard, patchDashboard, duplicateDashboard, deleteDashboard } from "@/features/dashboards/api";
import { DashboardEntitySchema, WorkspaceRequiredError } from "@/features/dashboards/schemas";
import type { DashboardEntity, DashboardWidget, DashboardLayoutItem } from "@/features/dashboards/types";

// GridLayout's layout type - matching DashboardLayoutItem structure
type RGLLayout = DashboardLayoutItem;

// Type-safe GridLayout wrapper to handle @types/react-grid-layout@1.3.6 vs react-grid-layout@2.2.2 mismatch
interface TypedGridLayoutProps {
  className?: string;
  layout: RGLLayout[];
  cols: number;
  rowHeight: number;
  width: number;
  onLayoutChange: (layout: RGLLayout[]) => void;
  isDraggable: boolean;
  isResizable: boolean;
  draggableHandle: string;
  children: React.ReactNode;
}
const TypedGridLayout = GridLayout as unknown as React.ComponentType<TypedGridLayoutProps>;
import { createWidget, getWidgetsByCategory, widgetRegistry } from "@/features/dashboards/widget-registry";
import type { WidgetType } from "@/features/dashboards/types";
import { WidgetRenderer } from "@/features/dashboards/widgets/WidgetRenderer";
import { AICopilotPanel } from "@/features/dashboards/AICopilotPanel";
import { track } from "@/lib/telemetry";
import { hasFlag } from "@/lib/flags";
import { useAuth } from "@/state/AuthContext";
import { useWorkspaceStore } from "@/state/workspace.store";

export function DashboardBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "ADMIN";
  const { activeWorkspaceId } = useWorkspaceStore();

  // State
  const [dashboard, setDashboard] = useState<DashboardEntity | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaceError, setWorkspaceError] = useState(false);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [showWidgetLibrary, setShowWidgetLibrary] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showCopilot, setShowCopilot] = useState(false);

  // Dirty tracking
  const [isDirty, setIsDirty] = useState(false);
  const [history, setHistory] = useState<DashboardEntity[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const initialDashboardRef = useRef<DashboardEntity | null>(null);

  // Load dashboard
  const loadDashboard = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      setWorkspaceError(false);
      const data = await fetchDashboard(id);
      // Validate with zod and cast to DashboardEntity
      const validated = DashboardEntitySchema.parse(data) as DashboardEntity;
      setDashboard(validated);
      initialDashboardRef.current = JSON.parse(JSON.stringify(validated)) as DashboardEntity; // Deep clone
      setHistory([validated]);
      setHistoryIndex(0);
      setIsDirty(false);
      setSelectedWidgetId(null);
    } catch (err: any) {
      if (err instanceof WorkspaceRequiredError) {
        setWorkspaceError(true);
        setError("Please select a workspace to edit this dashboard.");
      } else {
        const requestId = err?.response?.headers?.['x-request-id'];
        setError(err?.response?.data?.message || `Failed to load dashboard${requestId ? ` (RequestId: ${requestId})` : ''}`);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Mark dirty on any change
  const markDirty = useCallback(() => {
    setIsDirty(true);
  }, []);

  // Update dashboard and track history
  const updateDashboard = useCallback((updater: (prev: DashboardEntity) => DashboardEntity) => {
    setDashboard((prev) => {
      if (!prev) return prev;
      const updated = updater(prev);
      // Add to history
      setHistory((h) => {
        const newHistory = h.slice(0, historyIndex + 1);
        newHistory.push(updated);
        return newHistory;
      });
      setHistoryIndex((i) => i + 1);
      markDirty();
      return updated;
    });
  }, [historyIndex, markDirty]);

  // Undo/Redo
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleUndo = () => {
    if (canUndo) {
      setHistoryIndex((i) => i - 1);
      setDashboard(history[historyIndex - 1]);
      markDirty();
    }
  };

  const handleRedo = () => {
    if (canRedo) {
      setHistoryIndex((i) => i + 1);
      setDashboard(history[historyIndex + 1]);
      markDirty();
    }
  };

  // Save dashboard
  const handleSave = async () => {
    if (!dashboard || !id || !isDirty) return;

    try {
      setSaving(true);
      setError(null);
      await patchDashboard(id, {
        name: dashboard.name,
        description: dashboard.description,
        visibility: dashboard.visibility,
        widgets: dashboard.widgets,
      });
      setIsDirty(false);
      initialDashboardRef.current = JSON.parse(JSON.stringify(dashboard));
      track("ui.db.save.success", { id });
    } catch (err: any) {
      if (err instanceof WorkspaceRequiredError) {
        setWorkspaceError(true);
        setError("Please select a workspace to save this dashboard.");
      } else {
        const requestId = err?.response?.headers?.['x-request-id'];
        setError(err?.response?.data?.message || `Failed to save dashboard${requestId ? ` (RequestId: ${requestId})` : ''}`);
      }
      track("ui.db.save.error", { id, error: err?.message });
    } finally {
      setSaving(false);
    }
  };

  // Preview - block if dirty
  const handlePreview = () => {
    if (isDirty) {
      if (!window.confirm("You have unsaved changes. Save first?")) {
        return;
      }
      handleSave().then(() => {
        if (!isDirty && id) {
          navigate(`/dashboards/${id}`);
        }
      });
    } else if (id) {
      navigate(`/dashboards/${id}`);
    }
  };

  // Add widget
  const handleAddWidget = (type: WidgetType) => {
    if (!dashboard) return;

    // Find next available position
    const maxY = dashboard.widgets.reduce((max, w) => Math.max(max, (w.layout.y || 0) + (w.layout.h || 3)), 0);
    const newWidget = createWidget(type, { x: 0, y: maxY });

    updateDashboard((prev) => ({
      ...prev,
      widgets: [...prev.widgets, newWidget],
    }));

    setSelectedWidgetId(newWidget.id);
    setShowWidgetLibrary(false);
    track("ui.db.widget.add", { type, dashboardId: id });
  };

  // Remove widget
  const handleRemoveWidget = (widgetId: string) => {
    if (!dashboard) return;

    updateDashboard((prev) => ({
      ...prev,
      widgets: prev.widgets.filter((w) => w.id !== widgetId),
    }));

    if (selectedWidgetId === widgetId) {
      setSelectedWidgetId(null);
    }
    track("ui.db.widget.remove", { widgetId, dashboardId: id });
  };

  // Layout change handler
  const handleLayoutChange = (layout: RGLLayout[]) => {
    if (!dashboard) return;

    updateDashboard((prev) => ({
      ...prev,
      widgets: prev.widgets.map((widget) => {
        const layoutItem = layout.find((item) => item.i === widget.id);
        if (layoutItem) {
          return {
            ...widget,
            layout: {
              x: layoutItem.x,
              y: layoutItem.y,
              w: layoutItem.w,
              h: layoutItem.h,
            },
          };
        }
        return widget;
      }),
    }));
  };

  // Update widget config
  const updateWidgetConfig = (widgetId: string, config: Partial<DashboardWidget>) => {
    updateDashboard((prev) => ({
      ...prev,
      widgets: prev.widgets.map((w) =>
        w.id === widgetId ? { ...w, ...config } : w
      ),
    }));
  };

  // Update dashboard settings
  const updateDashboardSettings = (settings: Partial<Pick<DashboardEntity, "name" | "description" | "visibility">>) => {
    updateDashboard((prev) => ({
      ...prev,
      ...settings,
    }));
  };

  // Duplicate
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

  // Delete
  const handleDelete = async () => {
    if (!dashboard?.id) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!dashboard?.id) return;
    try {
      await deleteDashboard(dashboard.id);
      track("ui.db.delete.success", { id: dashboard.id });
      navigate("/dashboards");
    } catch (error) {
      track("ui.db.delete.error", { id: dashboard.id });
      console.error('Failed to delete dashboard:', error);
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  // Convert widgets to grid layout format
  const layoutItems: RGLLayout[] = dashboard?.widgets.map((w) => ({
    i: w.id,
    x: w.layout.x,
    y: w.layout.y,
    w: w.layout.w,
    h: w.layout.h,
    minW: 2,
    minH: 2,
  })) || [];

  const selectedWidget = dashboard?.widgets.find((w) => w.id === selectedWidgetId);

  // Workspace error
  if (workspaceError) {
    return (
      <div className="p-6" data-testid="dashboard-builder">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-yellow-800 font-medium">Select a workspace.</p>
          <p className="text-yellow-700 text-sm mt-1">Please select a workspace from the sidebar to edit this dashboard.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6" data-testid="dashboard-builder">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (error && !dashboard) {
    return (
      <div className="p-6" data-testid="dashboard-builder">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="p-6" data-testid="dashboard-builder">
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
          <p className="text-gray-800">Dashboard not found.</p>
        </div>
      </div>
    );
  }

  const widgetsByCategory = getWidgetsByCategory();

  return (
    <div className="h-screen flex flex-col" data-testid="dashboard-builder">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-white" data-testid="builder-toolbar">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="dashboard-toolbar-save"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save"}
          </button>

          <button
            onClick={handlePreview}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            data-testid="dashboard-toolbar-preview"
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </button>

          <div className="flex items-center border border-gray-300 rounded-md">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className="p-2 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="dashboard-toolbar-undo"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              className="p-2 border-l border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="dashboard-toolbar-redo"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setShowWidgetLibrary(true)}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
            data-testid="dashboard-toolbar-add"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Widget
          </button>

          <button
            onClick={() => setShowCopilot(!showCopilot)}
            className={`inline-flex items-center px-3 py-2 text-sm font-medium border rounded-md ${
              showCopilot
                ? "text-white bg-indigo-600 border-indigo-600 hover:bg-indigo-700"
                : "text-gray-700 bg-white border-gray-300 hover:bg-gray-50"
            }`}
            data-testid="dashboard-toolbar-copilot"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Copilot
          </button>
        </div>

        <div className="flex items-center space-x-3">
          {isDirty && (
            <span className="text-sm text-amber-600" data-testid="dirty-indicator">
              Unsaved changes
            </span>
          )}

          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              data-testid="dashboard-toolbar-more"
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

      {/* Error Display */}
      {error && (
        <div className="px-6 py-2 bg-red-50 border-b border-red-200">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Main Content: Left Canvas + Right Panel (Inspector or Copilot) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Grid Canvas */}
        <div className={`overflow-auto bg-gray-50 p-4 ${showCopilot ? "flex-1" : "flex-1"}`}>
          {dashboard.widgets.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-gray-500 mb-4">No widgets yet. Add a widget to get started.</p>
                <button
                  onClick={() => setShowWidgetLibrary(true)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Widget
                </button>
              </div>
            </div>
          ) : (
            <TypedGridLayout
              className="layout"
              layout={layoutItems}
              cols={12}
              rowHeight={60}
              width={1200}
              onLayoutChange={handleLayoutChange}
              isDraggable={true}
              isResizable={true}
              draggableHandle=".widget-drag-handle"
            >
              {dashboard.widgets.map((widget) => {
                const isSelected = selectedWidgetId === widget.id;
                return (
                  <div
                    key={widget.id}
                    className={`bg-white border-2 rounded-lg p-4 ${
                      isSelected ? "border-indigo-500 shadow-lg" : "border-gray-200"
                    }`}
                    onClick={() => setSelectedWidgetId(widget.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="widget-drag-handle cursor-move text-gray-400 hover:text-gray-600">
                          ⋮⋮
                        </div>
                        <h4 className="font-medium text-gray-900">{widget.title}</h4>
                        <span className="text-xs text-gray-500">({widget.type})</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveWidget(widget.id);
                        }}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-sm text-gray-600">
                      <WidgetRenderer
                        widget={widget}
                        data={undefined}
                        filters={{
                          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default: 30 days ago
                          endDate: new Date().toISOString().split('T')[0], // Default: today
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </TypedGridLayout>
          )}
        </div>

        {/* Right: Inspector Panel or Copilot Panel */}
        <div className="w-80 border-l bg-white overflow-hidden flex flex-col">
          {showCopilot ? (
            <AICopilotPanel
              dashboard={dashboard}
              workspaceId={activeWorkspaceId}
              startDate={new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
              endDate={new Date().toISOString().split('T')[0]}
              onApplyWidgets={(widgets) => {
                updateDashboard((prev) => ({ ...prev, widgets }));
                markDirty();
              }}
              onApplyDashboard={(dash) => {
                updateDashboard((prev) => ({ ...prev, ...dash }));
                markDirty();
              }}
            />
          ) : (
            <div className="overflow-y-auto">
              {selectedWidget ? (
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Widget Settings</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                      <input
                        type="text"
                        value={selectedWidget.title}
                        onChange={(e) => updateWidgetConfig(selectedWidget.id, { title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <input
                        type="text"
                        value={selectedWidget.type}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Config (JSON)</label>
                      <textarea
                        value={JSON.stringify(selectedWidget.config, null, 2)}
                        onChange={(e) => {
                          try {
                            const config = JSON.parse(e.target.value);
                            updateWidgetConfig(selectedWidget.id, { config });
                          } catch {
                            // Invalid JSON, ignore
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-xs"
                        rows={6}
                      />
                    </div>

                    <button
                      onClick={() => handleRemoveWidget(selectedWidget.id)}
                      className="w-full px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100"
                    >
                      Remove Widget
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Dashboard Settings</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input
                        type="text"
                        value={dashboard.name}
                        onChange={(e) => updateDashboardSettings({ name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        value={dashboard.description || ""}
                        onChange={(e) => updateDashboardSettings({ description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        rows={3}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
                      <select
                        value={dashboard.visibility}
                        onChange={(e) => updateDashboardSettings({ visibility: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="WORKSPACE">Workspace</option>
                        <option value="PRIVATE">Private</option>
                        {isAdmin && <option value="ORG">Organization</option>}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Widget Library Modal */}
      {showWidgetLibrary && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setShowWidgetLibrary(false)} />

            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Add Widget</h3>
                <button
                  onClick={() => setShowWidgetLibrary(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {Object.entries(widgetsByCategory).map(([category, types]) => (
                  <div key={category}>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">{category}</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {types.map((type) => {
                        const registry = widgetRegistry[type];
                        return (
                          <button
                            key={type}
                            onClick={() => handleAddWidget(type)}
                            className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 text-left transition-colors"
                            data-testid={`builder-add-widget-${type}`}
                          >
                            <div className="font-medium text-gray-900">{registry.displayName}</div>
                            <div className="text-sm text-gray-600 mt-1">{registry.description}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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
