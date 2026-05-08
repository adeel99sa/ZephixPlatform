import { useCallback, useEffect, useMemo, useState } from "react";
import { MoreHorizontal } from "lucide-react";

import {
  administrationApi,
  type AdminDirectoryUser,
} from "@/features/administration/api/administration.api";
import { InviteOrgMemberDialog } from "@/features/administration/components/InviteOrgMemberDialog";
import { EditOrgMemberDialog } from "@/features/administration/components/EditOrgMemberDialog";
import { RoleSelector } from "@/components/admin/RoleSelector";
import { normalizePlatformRole, PLATFORM_ROLE } from "@/utils/roles";
import type { OrgRoleUi } from "@/lib/auth/auth.types";

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

function toDropdownRole(member: AdminDirectoryUser): OrgRoleUi {
  const raw = member.platformRole ?? member.role;
  const normalized = normalizePlatformRole(raw);
  if (normalized === PLATFORM_ROLE.ADMIN) return "admin";
  if (normalized === PLATFORM_ROLE.VIEWER) return "viewer";
  return "member";
}

function mapInvitePlatformRole(member: AdminDirectoryUser): "Admin" | "Member" | "Viewer" {
  const r = toDropdownRole(member);
  if (r === "admin") return "Admin";
  if (r === "viewer") return "Viewer";
  return "Member";
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
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editUserId, setEditUserId] = useState<string | null>(null);

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

  const nonOwnerAdminCount = useMemo(
    () =>
      users.filter((u) => !u.isOwner && normalizePlatformRole(u.platformRole ?? u.role) === PLATFORM_ROLE.ADMIN)
        .length,
    [users],
  );

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) ?? null,
    [users, selectedUserId],
  );

  const editUser = useMemo(() => users.find((u) => u.id === editUserId) ?? null, [users, editUserId]);

  function isLastOrgAdmin(member: AdminDirectoryUser): boolean {
    if (member.isOwner) return false;
    const pr = normalizePlatformRole(member.platformRole ?? member.role);
    if (pr !== PLATFORM_ROLE.ADMIN) return false;
    return nonOwnerAdminCount <= 1;
  }

  async function applyRoleChange(userId: string, role: OrgRoleUi) {
    setBusyUserId(userId);
    try {
      await administrationApi.changeUserRole(userId, role);
      await loadUsers();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { code?: string; message?: string } } };
      const code = ax?.response?.data?.code;
      if (code === "LAST_ADMIN_DEMOTE_BLOCKED") {
        setError("Cannot demote — last organization admin. Promote another admin first.");
      } else {
        setError(ax?.response?.data?.message || "Failed to change role.");
      }
    } finally {
      setBusyUserId(null);
    }
  }

  async function onDeactivateUser(userId: string) {
    if (!window.confirm("Deactivate this person’s organization access?")) return;
    setBusyUserId(userId);
    setMenuUserId(null);
    try {
      await administrationApi.deactivateUser(userId, "Deactivated from People page");
      setEditUserId(null);
      setSelectedUserId(null);
      await loadUsers();
    } catch {
      setError("Failed to deactivate user.");
    } finally {
      setBusyUserId(null);
    }
  }

  async function onReinvite(member: AdminDirectoryUser) {
    setBusyUserId(member.id);
    try {
      await administrationApi.inviteUsers({
        emails: [member.email.trim().toLowerCase()],
        platformRole: mapInvitePlatformRole(member),
      });
      await loadUsers();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax?.response?.data?.message || "Reinvite failed.");
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">People</h1>
          <p className="mt-1 text-sm text-gray-500">
            {memberCount} members · {seatLimit != null && Number.isFinite(seatLimit) ? seatLimit : "∞"} seats
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Organization roles use Admin, Member, and Viewer. Workspace membership counts are managed per workspace.
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
          aria-label="Search people"
        />
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                activeFilter === filter ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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
          <table className="w-full min-w-[960px]">
            <thead>
              <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Org role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last active</th>
                <th className="px-4 py-3">Workspaces</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-8 text-sm text-gray-500" colSpan={7}>
                    Loading users…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-sm text-gray-500" colSpan={7}>
                    No users match your filters.
                  </td>
                </tr>
              ) : (
                users.map((member) => {
                  const dropdownRole = toDropdownRole(member);
                  const lastAdmin = isLastOrgAdmin(member);
                  const wsCount = member.workspaceAccess?.length ?? 0;
                  return (
                    <tr
                      key={member.id}
                      className={`cursor-pointer border-b border-gray-100 hover:bg-gray-50/80 ${
                        selectedUserId === member.id ? "bg-indigo-50/60" : ""
                      }`}
                      onClick={() => setSelectedUserId((id) => (id === member.id ? null : member.id))}
                    >
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
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {member.isOwner ? (
                          <span className="text-sm font-medium text-gray-800">Owner</span>
                        ) : (
                          <RoleSelector
                            kind="org"
                            aria-label={`Organization role for ${member.name}`}
                            value={dropdownRole}
                            disabled={busyUserId === member.id || lastAdmin}
                            disabledReason={
                              lastAdmin ? "Cannot demote — last organization admin. Promote another admin first." : ""
                            }
                            onChange={(next) => {
                              if (next === dropdownRole) return;
                              void applyRoleChange(member.id, next);
                            }}
                          />
                        )}
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
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <button
                          type="button"
                          className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUserId(member.id);
                          }}
                        >
                          {wsCount}
                        </button>
                      </td>
                      <td className="relative px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
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
                            className="absolute right-4 z-[60] mt-1 w-52 rounded-md border border-gray-200 bg-white py-1 text-left shadow-lg"
                            role="menu"
                          >
                            <button
                              type="button"
                              role="menuitem"
                              className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                              onClick={() => {
                                setEditUserId(member.id);
                                setMenuUserId(null);
                              }}
                            >
                              Edit details…
                            </button>
                            {member.status === "invited" ? (
                              <button
                                type="button"
                                role="menuitem"
                                className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                onClick={() => void onReinvite(member)}
                              >
                                Reinvite
                              </button>
                            ) : null}
                            <button
                              type="button"
                              role="menuitem"
                              className="block w-full px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                              onClick={() => void onDeactivateUser(member.id)}
                            >
                              Deactivate access
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

      {selectedUser ? (
        <section
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          aria-label={`Workspace memberships for ${selectedUser.name}`}
        >
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Workspace memberships</h2>
              <p className="text-xs text-gray-500">{selectedUser.name}</p>
            </div>
            <button
              type="button"
              className="text-xs font-medium text-gray-600 hover:text-gray-900"
              onClick={() => setSelectedUserId(null)}
            >
              Close panel
            </button>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="py-2 pr-4">Workspace</th>
                  <th className="py-2 pr-4">Access</th>
                </tr>
              </thead>
              <tbody>
                {(selectedUser.workspaceAccess ?? []).length === 0 ? (
                  <tr>
                    <td className="py-3 text-gray-600" colSpan={2}>
                      No workspace memberships recorded for this user.
                    </td>
                  </tr>
                ) : (
                  selectedUser.workspaceAccess!.map((w) => (
                    <tr key={w.workspaceId} className="border-t border-gray-100">
                      <td className="py-2 pr-4 text-gray-900">{w.workspaceName}</td>
                      <td className="py-2 pr-4 text-gray-700">{w.accessLevel}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
            Project assignments will appear here once Work Management ships.
          </div>
        </section>
      ) : null}

      {menuUserId ? (
        <button
          type="button"
          className="fixed inset-0 z-[50] cursor-default bg-transparent"
          aria-label="Close actions menu"
          onClick={() => setMenuUserId(null)}
        />
      ) : null}

      <InviteOrgMemberDialog isOpen={inviteOpen} onClose={() => setInviteOpen(false)} onSuccess={() => void loadUsers()} />

      <EditOrgMemberDialog
        member={editUser}
        isOpen={Boolean(editUser)}
        onClose={() => setEditUserId(null)}
        dropdownRole={editUser ? toDropdownRole(editUser) : "member"}
        roleDisabled={editUser ? isLastOrgAdmin(editUser) : false}
        roleDisabledReason={editUser && isLastOrgAdmin(editUser) ? "Cannot demote — last organization admin." : undefined}
        busy={busyUserId === editUser?.id}
        onRoleChange={(role) => {
          if (!editUser || editUser.isOwner) return;
          void applyRoleChange(editUser.id, role);
        }}
        onDeactivate={() => editUser && void onDeactivateUser(editUser.id)}
        onReinvite={editUser && editUser.status === "invited" ? () => void onReinvite(editUser) : undefined}
      />
    </div>
  );
}
