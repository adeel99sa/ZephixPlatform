import { useEffect, useMemo, useState } from "react";
import {
  administrationApi,
  type AdminDirectoryUser,
} from "@/features/administration/api/administration.api";
import { InviteMembersDialog } from "../components/InviteMembersDialog";

export default function AdministrationUsersPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminDirectoryUser[]>([]);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await administrationApi.listUsers({ page: 1, limit: 100 });
      setUsers(result.data);
    } catch {
      setError("Failed to load users.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      await loadUsers();
      if (!active) return;
    })();

    return () => {
      active = false;
    };
  }, []);

  // MVP-2: window.prompt replaced with InviteMembersDialog.
  // The dialog handles emails, role selection, workspace assignment,
  // and per-email result display.

  const onChangeRole = async (userId: string, role: "admin" | "member" | "viewer") => {
    setBusyUserId(userId);
    try {
      await administrationApi.changeUserRole(userId, role);
      await loadUsers();
    } catch {
      setError("Failed to change role.");
    } finally {
      setBusyUserId(null);
    }
  };

  const onDeactivate = async (userId: string) => {
    setBusyUserId(userId);
    try {
      await administrationApi.deactivateUser(userId, "Deactivated from administration users page");
      await loadUsers();
    } catch {
      setError("Failed to deactivate user.");
    } finally {
      setBusyUserId(null);
    }
  };

  const tableRows = useMemo(
    () =>
      users.map((user) => ({
        id: user.id,
        name: user.name,
        role: user.role,
        status: user.status,
      })),
    [users],
  );

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">People</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your organization's members, roles, and access.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Invite people
        </button>
      </header>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-gray-500" colSpan={4}>
                    Loading users...
                  </td>
                </tr>
              ) : tableRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-gray-500" colSpan={4}>
                    No users available.
                  </td>
                </tr>
              ) : (
                tableRows.map((row) => (
                  <tr key={row.id} className="border-t border-gray-200 text-sm text-gray-700">
                    <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                    <td className="px-4 py-3 uppercase">{row.role}</td>
                    <td className="px-4 py-3 capitalize">{row.status}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={busyUserId === row.id}
                          onClick={() =>
                            onChangeRole(
                              row.id,
                              row.role === "admin" ? "member" : "admin",
                            )
                          }
                          className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                        >
                          {row.role === "admin" ? "Set member" : "Set admin"}
                        </button>
                        <button
                          type="button"
                          disabled={busyUserId === row.id}
                          onClick={() => onDeactivate(row.id)}
                          className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                        >
                          Deactivate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <InviteMembersDialog
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSuccess={() => void loadUsers()}
      />
    </div>
  );
}
