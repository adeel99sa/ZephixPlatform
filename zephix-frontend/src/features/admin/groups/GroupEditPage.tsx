import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { groupsApi, type Group, type UpdateGroupRequest } from "./groups.api";
import { track } from "@/lib/telemetry";
import { ArrowLeft, Save, Users } from "lucide-react";

export default function GroupEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<UpdateGroupRequest>({
    name: "",
    description: "",
  });

  useEffect(() => {
    if (id) {
      loadGroup();
    }
  }, [id]);

  const loadGroup = async () => {
    if (!id) return;

    try {
      setLoading(true);
      // TODO: Implement getGroup API
      // const groupData = await groupsApi.getGroup(id);
      // setGroup(groupData);
      // setFormData({
      //   name: groupData.name,
      //   description: groupData.description || "",
      // });
      setError("Groups API not yet implemented");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load group");
      console.error("Failed to load group:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;

    setSaving(true);
    setError(null);

    try {
      await groupsApi.updateGroup(id, formData);
      track("admin.groups.updated", { groupId: id, updates: formData });
      navigate("/admin/groups");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to update group");
      console.error("Failed to update group:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6" data-testid="admin-group-edit-root">
        <div className="text-center text-gray-500">Loading group...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="admin-group-edit-root">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/admin/groups")}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Edit Group</h1>
            <p className="text-sm text-gray-500 mt-1">Manage group details and members</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="save-group-button"
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
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Group Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                data-testid="edit-group-name"
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
                data-testid="edit-group-description"
              />
            </div>
          </div>
        </div>

        {/* Members List - Placeholder */}
        <div className="pt-6 border-t border-gray-200">
          <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Members
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-500">
            TODO: Add member management here
          </div>
        </div>

        {/* Permissions Section - Placeholder */}
        <div className="pt-6 border-t border-gray-200">
          <h3 className="text-md font-semibold text-gray-900 mb-4">Permissions</h3>
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-500">
            TODO: Add permissions configuration here (Phase 7)
          </div>
        </div>
      </div>
    </div>
  );
}

