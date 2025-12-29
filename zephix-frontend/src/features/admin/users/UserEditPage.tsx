import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usersApi, type User, type UpdateUserRequest } from "./users.api";
import { track } from "@/lib/telemetry";
import { ArrowLeft, Save } from "lucide-react";

export default function UserEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<UpdateUserRequest>({
    firstName: "",
    lastName: "",
    role: "member",
    status: "active",
  });

  useEffect(() => {
    if (id) {
      loadUser();
    }
  }, [id]);

  const loadUser = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const userData = await usersApi.getUser(id);
      setUser(userData);
      setFormData({
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        status: userData.status,
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load user");
      console.error("Failed to load user:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;

    setSaving(true);
    setError(null);

    try {
      await usersApi.updateUser(id, formData);
      track("admin.users.updated", { userId: id, updates: formData });
      navigate("/admin/users");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to update user");
      console.error("Failed to update user:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6" data-testid="admin-user-edit-root">
        <div className="text-center text-gray-500">Loading user...</div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="p-6" data-testid="admin-user-edit-root">
        <div className="text-center text-red-500">{error}</div>
        <button
          onClick={() => navigate("/admin/users")}
          className="mt-4 text-blue-600 hover:text-blue-700"
        >
          ← Back to Users
        </button>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="p-6 space-y-6" data-testid="admin-user-edit-root">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/admin/users")}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Edit User</h1>
            <p className="text-sm text-gray-500 mt-1">{user.email}</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="save-user-button"
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

      {/* User Details Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">User Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                data-testid="edit-user-first-name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                data-testid="edit-user-last-name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                data-testid="edit-user-email"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    role: e.target.value as "owner" | "admin" | "member" | "viewer",
                  })
                }
                disabled={user.role === "owner"}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
                data-testid="edit-user-role"
              >
                <option value="viewer">Viewer</option>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                {user.role === "owner" && <option value="owner">Owner</option>}
              </select>
              {user.role === "owner" && (
                <p className="text-xs text-gray-500 mt-1">Owner role cannot be changed</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as "active" | "inactive",
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                data-testid="edit-user-status"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Workspace Assignments - Placeholder */}
        <div className="pt-6 border-t border-gray-200">
          <h3 className="text-md font-semibold text-gray-900 mb-4">Workspace Assignments</h3>
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-500">
            TODO: Add workspace assignment management here
          </div>
        </div>
      </div>
    </div>
  );
}

















