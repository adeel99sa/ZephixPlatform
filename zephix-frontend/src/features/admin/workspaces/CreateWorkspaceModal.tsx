import { useState, useEffect } from "react";
import { workspacesApi, type CreateWorkspaceRequest } from "./workspaces.api";
import { listOrgUsers } from "@/features/workspaces/workspace.api";
import { track } from "@/lib/telemetry";
import { X } from "lucide-react";

interface CreateWorkspaceModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface OrgUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export default function CreateWorkspaceModal({
  onClose,
  onSuccess,
}: CreateWorkspaceModalProps) {
  const [formData, setFormData] = useState<CreateWorkspaceRequest>({
    name: "",
    description: "",
    ownerId: "",
    visibility: "private",
    defaultMethodology: "agile",
    memberIds: [],
  });
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOrgUsers();
  }, []);

  const loadOrgUsers = async () => {
    try {
      setLoadingUsers(true);
      const users = await listOrgUsers();
      setOrgUsers(users);
    } catch (err) {
      console.error("Failed to load org users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!formData.ownerId) {
      setError("Please select a workspace owner");
      setLoading(false);
      return;
    }

    try {
      await workspacesApi.createWorkspace(formData);
      track("admin.workspaces.created", { name: formData.name, ownerId: formData.ownerId });
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to create workspace");
      console.error("Failed to create workspace:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMemberToggle = (userId: string) => {
    const memberIds = formData.memberIds || [];
    if (memberIds.includes(userId)) {
      setFormData({
        ...formData,
        memberIds: memberIds.filter((id) => id !== userId),
      });
    } else {
      setFormData({
        ...formData,
        memberIds: [...memberIds, userId],
      });
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      data-testid="create-workspace-modal"
    >
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Create Workspace</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            data-testid="create-workspace-modal-close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              data-testid="create-workspace-name"
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
              data-testid="create-workspace-description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Workspace Owner <span className="text-red-500">*</span>
            </label>
            {loadingUsers ? (
              <div className="text-sm text-gray-500">Loading users...</div>
            ) : (
              <select
                required
                value={formData.ownerId}
                onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                data-testid="create-workspace-owner"
              >
                <option value="">Choose a user...</option>
                {orgUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName && user.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user.email}{" "}
                    ({user.email})
                  </option>
                ))}
              </select>
            )}
          </div>

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
              data-testid="create-workspace-visibility"
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Methodology
            </label>
            <select
              value={formData.defaultMethodology}
              onChange={(e) =>
                setFormData({ ...formData, defaultMethodology: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              data-testid="create-workspace-methodology"
            >
              <option value="agile">Agile</option>
              <option value="waterfall">Waterfall</option>
              <option value="scrum">Scrum</option>
              <option value="kanban">Kanban</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Members (optional)
            </label>
            <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
              {loadingUsers ? (
                <div className="text-sm text-gray-500">Loading users...</div>
              ) : orgUsers.length === 0 ? (
                <div className="text-sm text-gray-500">No users available</div>
              ) : (
                <div className="space-y-2">
                  {orgUsers.map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={formData.memberIds?.includes(user.id) || false}
                        onChange={() => handleMemberToggle(user.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        {user.firstName && user.lastName
                          ? `${user.firstName} ${user.lastName}`
                          : user.email}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.ownerId}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="create-workspace-submit"
            >
              {loading ? "Creating..." : "Create Workspace"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


















