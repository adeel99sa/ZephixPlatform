import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { workspacesApi, type Workspace, type UpdateWorkspaceRequest } from "./workspaces.api";
import { track } from "@/lib/telemetry";
import { ArrowLeft, Save, Users, Settings } from "lucide-react";

export default function WorkspaceEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<UpdateWorkspaceRequest>({
    name: "",
    description: "",
    visibility: "private",
    status: "active",
  });

  useEffect(() => {
    if (id) {
      loadWorkspace();
    }
  }, [id]);

  const loadWorkspace = async () => {
    if (!id) return;

    try {
      setLoading(true);
      // TODO: Implement getWorkspace API
      // const workspaceData = await workspacesApi.getWorkspace(id);
      // setWorkspace(workspaceData);
      // setFormData({
      //   name: workspaceData.name,
      //   description: workspaceData.description || "",
      //   visibility: workspaceData.visibility,
      //   status: workspaceData.status,
      // });
      setError("Workspace detail API not yet implemented");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load workspace");
      console.error("Failed to load workspace:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;

    setSaving(true);
    setError(null);

    try {
      await workspacesApi.updateWorkspace(id, formData);
      track("admin.workspaces.updated", { workspaceId: id, updates: formData });
      navigate("/admin/workspaces");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to update workspace");
      console.error("Failed to update workspace:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6" data-testid="admin-workspace-edit-root">
        <div className="text-center text-gray-500">Loading workspace...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="admin-workspace-edit-root">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/admin/workspaces")}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Edit Workspace</h1>
            <p className="text-sm text-gray-500 mt-1">Manage workspace details and settings</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="save-workspace-button"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        {/* Overview Section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Overview
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                data-testid="edit-workspace-name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                data-testid="edit-workspace-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Visibility
                </label>
                <select
                  value={formData.visibility}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      visibility: e.target.value as "public" | "private",
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  data-testid="edit-workspace-visibility"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as "active" | "archived",
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  data-testid="edit-workspace-status"
                >
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Members Section - Placeholder */}
        <div className="pt-6 border-t border-gray-200">
          <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Members
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-500">
            TODO: Add member management here
          </div>
        </div>

        {/* Settings Section - Placeholder */}
        <div className="pt-6 border-t border-gray-200">
          <h3 className="text-md font-semibold text-gray-900 mb-4">Settings</h3>
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-500">
            TODO: Add workspace settings configuration here
          </div>
        </div>
      </div>
    </div>
  );
}

