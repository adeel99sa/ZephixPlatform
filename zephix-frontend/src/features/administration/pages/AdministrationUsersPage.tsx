import { useCallback, useEffect, useMemo, useState } from "react";
import { MoreHorizontal } from "lucide-react";

import {
  administrationApi,
  type AdminDirectoryUser,
} from "@/features/administration/api/administration.api";
import { InviteMembersDialog } from "../components/InviteMembersDialog";

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function formatRelative(iso?: string | null): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const diff = Date.now() - t;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "Just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 48) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

function initials(user: AdminDirectoryUser): string {
  const parts = user.name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2);
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (user.email || "?").slice(0, 2).toUpperCase();
}

const STATUS_FILTERS = ["All", "Active", "Suspended", "Invited"] as const;

export default function AdministrationUsersPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminDirectoryUser[]>([]);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<(typeof STATUS_FILTERS)[number]>("All");
  const [menuUserId, setMenuUserId] = useState<string | null>(null);
  const [seatLimit, setSeatLimit] = useState<number | null>(null);
  const [memberCount, setMemberCount] = useState(0);

  const statusParam = useMemo(() => {
    if (activeFilter === "All") return "all";
    return activeFilter.toLowerCase();
  }, [activeFilter]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await administrationApi.listUsers({
        page: 1,
        limit: 100,
        search: searchQuery.trim() || undefined,
        status: statusParam,
      });
      setUsers(result.data);
      setSeatLimit(result.seatLimit);
      setMemberCount(result.memberCount);
    } catch {
      setError("Failed to load users.");
      setUsers([]);
      setSeatLimit(null);
      setMemberCount(0);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusParam]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void loadUsers();
    }, 300);
    return () => window.clearTimeout(t);
  }, [loadUsers]);

  const onChangeRole = async (userId: string, role: "admin" | "member" | "viewer") => {
    if (!window.confirm(`Change this person’s role to ${role}?`)) return;
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

  const onRemove = async (userId: string) => {
    if (!window.confirm("Remove this person from the organization? They will lose access.")) {
      return;
    }
    setBusyUserId(userId);
    setMenuUserId(null);
    try {
      await administrationApi.deactivateUser(userId, "Removed from administration People page");
      await loadUsers();
    } catch {
      setError("Failed to remove user.");
    } finally {
      setBusyUserId(null);
    }
  };

  const onSuspend = async (userId: string) => {
    if (
      !window.confirm(
        "Suspend this member’s organization access? Their seat can be reassigned.",
      )
    ) {
      return;
    }
    setBusyUserId(userId);
    setMenuUserId(null);
    try {
      await administrationApi.deactivateUser(userId, "Suspended from administration People page");
      await loadUsers();
    } catch {
      setError("Failed to suspend user.");
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">People</h1>
          <p className="mt-1 text-sm text-gray-500">
            {memberCount} members · {seatLimit != null && Number.isFinite(seatLimit) ? seatLimit : "∞"} seats
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Manage your organization&apos;s members, roles, and access.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          className="shrink-0 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Invite people
        </button>
      </header>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <input
          type="text"
          placeholder="Search by name or email…"
          className="w-full flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-indigo-500"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                activeFilter === filter
                  ? "bg-blue-100 text-blue-800"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px]">
            <thead>
              <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Teams</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last active</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-8 text-sm text-gray-500" colSpan={8}>
                    Loading users…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-sm text-gray-500" colSpan={8}>
                    No users match your filters.
                  </td>
                </tr>
              ) : (
                users.map((member) => {
                  const dropdownRole = (member.platformRole ||
                    (member.role === "viewer"
                      ? "viewer"
                      : member.role === "admin"
                        ? "admin"
                        : "member")) as "admin" | "member" | "viewer";
                  return (
                    <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50/80">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white"
                            aria-hidden
                          >
                            {initials(member)}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-medium text-gray-900">{member.name}</div>
                            {member.isOwner ? (
                              <div className="text-[11px] font-medium text-amber-700">Organization owner</div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-sm text-gray-600">{member.email}</td>
                      <td className="px-4 py-3">
                        {member.isOwner ? (
                          <span className="text-sm font-medium text-gray-800">Owner</span>
                        ) : (
                          <select
                            value={dropdownRole}
                            disabled={busyUserId === member.id}
                            onChange={(e) =>
                              void onChangeRole(
                                member.id,
                                e.target.value as "admin" | "member" | "viewer",
                              )
                            }
                            className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={`Role for ${member.name}`}
                          >
                            <option value="admin">Admin</option>
                            <option value="member">Member</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex max-w-[220px] flex-wrap gap-1">
                          {member.teams.length === 0 ? (
                            <span className="text-xs text-gray-400">—</span>
                          ) : (
                            member.teams.map((team) => (
                              <span
                                key={team.id}
                                className="inline-flex max-w-[140px] truncate rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
                                title={team.name}
                              >
                                {team.name}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            member.status === "active"
                              ? "bg-green-100 text-green-800"
                              : member.status === "suspended"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {member.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                        {formatRelative(member.lastActiveAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                        {formatDate(member.joinedAt)}
                      </td>
                      <td className="relative px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={Boolean(member.isOwner) || busyUserId === member.id}
                          className="inline-flex rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-haspopup="menu"
                          aria-expanded={menuUserId === member.id}
                          onClick={() => setMenuUserId((id) => (id === member.id ? null : member.id))}
                        >
                          <MoreHorizontal className="h-5 w-5" aria-hidden />
                          <span className="sr-only">Open actions for {member.name}</span>
                        </button>
                        {menuUserId === member.id ? (
                          <div
                            className="absolute right-4 z-[60] mt-1 w-48 rounded-md border border-gray-200 bg-white py-1 text-left shadow-lg"
                            role="menu"
                          >
                            <button
                              type="button"
                              role="menuitem"
                              className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                              onClick={() => void onSuspend(member.id)}
                            >
                              Suspend access
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              className="block w-full px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                              onClick={() => void onRemove(member.id)}
                            >
                              Remove from organization
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {menuUserId ? (
        <button
          type="button"
          className="fixed inset-0 z-[50] cursor-default bg-transparent"
          aria-label="Close actions menu"
          onClick={() => setMenuUserId(null)}
        />
      ) : null}

      <InviteMembersDialog
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSuccess={() => void loadUsers()}
      />
    </div>
  );
}
