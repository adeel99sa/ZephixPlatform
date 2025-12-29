import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { groupsApi, type Group } from "./groups.api";
import { track } from "@/lib/telemetry";
import CreateGroupModal from "./CreateGroupModal";
import { Users, Plus, Edit, Trash2 } from "lucide-react";

export default function GroupsListPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    track("admin.groups.viewed");
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      // TODO: Implement groups API endpoint
      // const data = await groupsApi.getGroups();
      // setGroups(data);
      setGroups([]); // Placeholder
    } catch (error) {
      console.error("Failed to load groups:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (groupId: string) => {
    if (!confirm("Are you sure you want to delete this group?")) return;

    try {
      await groupsApi.deleteGroup(groupId);
      await loadGroups();
      track("admin.groups.deleted", { groupId });
    } catch (error) {
      console.error("Failed to delete group:", error);
      alert("Failed to delete group");
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="admin-groups-root">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Groups</h1>
          <p className="text-sm text-gray-500 mt-1">Manage user groups and permissions</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          data-testid="create-group-button"
        >
          <Plus className="h-4 w-4" />
          Create Group
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-12">Loading groups...</div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500 mb-2">No groups found</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="text-blue-600 hover:text-blue-700"
          >
            Create your first group →
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden" data-testid="admin-groups-table">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Members
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {groups.map((group) => (
                <tr key={group.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{group.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">{group.description || "-"}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{group.memberCount}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => navigate(`/admin/groups/${group.id}/edit`)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit group"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(group.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete group"
                      >
                        <Trash2 className="h-4 w-4" />
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
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadGroups();
          }}
        />
      )}
    </div>
  );
}

















