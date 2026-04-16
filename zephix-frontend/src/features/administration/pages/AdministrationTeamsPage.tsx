import { Fragment, useCallback, useEffect, useState } from "react";
import { Loader2, MoreHorizontal, UsersRound, X } from "lucide-react";

import {
  administrationApi,
  type AdminDirectoryUser,
  type AdminTeamDetail,
  type AdminTeamMember,
  type AdminTeamSummary,
} from "@/features/administration/api/administration.api";

function displayNameFromUser(user: AdminTeamMember["user"]): string {
  if (!user) return "Unknown";
  const n = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return n || user.email || "Unknown";
}

function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return (p[0][0] + p[1][0]).toUpperCase().slice(0, 2);
  if (p.length === 1 && p[0].length >= 2) return p[0].slice(0, 2).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

function roleLabel(role: string): string {
  const r = role.toUpperCase();
  if (r === "OWNER") return "Lead";
  return "Member";
}

type TeamModalMode = "create" | "edit" | null;

export default function AdministrationTeamsPage() {
  const [teams, setTeams] = useState<AdminTeamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [detailById, setDetailById] = useState<Record<string, AdminTeamDetail>>({});
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
  const [menuTeamId, setMenuTeamId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<TeamModalMode>(null);
  const [editingTeam, setEditingTeam] = useState<AdminTeamSummary | null>(null);
  const [formName, setFormName] = useState("");
  const [formShortCode, setFormShortCode] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [addMemberTeamId, setAddMemberTeamId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [userHits, setUserHits] = useState<AdminDirectoryUser[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [busyMemberKey, setBusyMemberKey] = useState<string | null>(null);

  const loadTeams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await administrationApi.listAdminTeams({ limit: 100, page: 1 });
      setTeams(rows);
    } catch {
      setError("Failed to load teams.");
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTeams();
  }, [loadTeams]);

  const loadDetail = async (teamId: string) => {
    setDetailLoadingId(teamId);
    try {
      const d = await administrationApi.getAdminTeam(teamId);
      setDetailById((prev) => ({ ...prev, [teamId]: d }));
    } catch {
      setError("Failed to load team members.");
    } finally {
      setDetailLoadingId(null);
    }
  };

  const toggleExpand = async (teamId: string) => {
    if (expandedTeamId === teamId) {
      setExpandedTeamId(null);
      return;
    }
    setExpandedTeamId(teamId);
    if (!detailById[teamId]) {
      await loadDetail(teamId);
    }
  };

  const openCreate = () => {
    setEditingTeam(null);
    setFormName("");
    setFormShortCode("");
    setFormDescription("");
    setModalMode("create");
  };

  const openEdit = (t: AdminTeamSummary) => {
    setEditingTeam(t);
    setFormName(t.name);
    setFormShortCode(t.shortCode || "");
    setFormDescription(t.description || "");
    setModalMode("edit");
    setMenuTeamId(null);
  };

  const submitModal = async () => {
    const name = formName.trim();
    const raw = formShortCode.trim().replace(/^@+/, "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
    if (!name || name.length < 2) {
      setError("Team name must be at least 2 characters.");
      return;
    }
    if (!raw || raw.length < 2) {
      setError("Alias (short code) must be at least 2 letters or numbers.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (modalMode === "create") {
        await administrationApi.createAdminTeam({
          name,
          shortCode: raw,
          description: formDescription.trim() || undefined,
          visibility: "public",
        });
      } else if (modalMode === "edit" && editingTeam) {
        await administrationApi.updateAdminTeam(editingTeam.id, {
          name,
          shortCode: raw,
          description: formDescription.trim() || undefined,
        });
      }
      setModalMode(null);
      setEditingTeam(null);
      setDetailById({});
      setExpandedTeamId(null);
      await loadTeams();
    } catch {
      setError("Could not save team. Check alias is unique.");
    } finally {
      setSaving(false);
    }
  };

  const onDeleteTeam = async (t: AdminTeamSummary) => {
    if (!window.confirm(`Archive team "${t.name}"? Members stay in the org but lose this team label.`)) return;
    setMenuTeamId(null);
    try {
      await administrationApi.deleteAdminTeam(t.id);
      setDetailById({});
      setExpandedTeamId(null);
      await loadTeams();
    } catch {
      setError("Failed to archive team.");
    }
  };

  useEffect(() => {
    if (addMemberTeamId == null) {
      setUserHits([]);
      return;
    }
    const q = userSearch.trim();
    if (q.length < 2) {
      setUserHits([]);
      return;
    }
    const id = window.setTimeout(() => {
      void (async () => {
        setUserSearchLoading(true);
        try {
          const res = await administrationApi.listUsers({
            search: q,
            limit: 20,
            page: 1,
            status: "all",
          });
          setUserHits(res.data);
        } catch {
          setUserHits([]);
        } finally {
          setUserSearchLoading(false);
        }
      })();
    }, 300);
    return () => window.clearTimeout(id);
  }, [userSearch, addMemberTeamId]);

  const onAddMember = async (teamId: string, userId: string) => {
    setBusyMemberKey(`${teamId}:${userId}`);
    setError(null);
    try {
      const updated = await administrationApi.addTeamMember(teamId, userId);
      setDetailById((prev) => ({ ...prev, [teamId]: updated }));
      setAddMemberTeamId(null);
      setUserSearch("");
      setUserHits([]);
      await loadTeams();
    } catch {
      setError("Could not add member.");
    } finally {
      setBusyMemberKey(null);
    }
  };

  const onRemoveMember = async (teamId: string, userId: string) => {
    if (!window.confirm("Remove this person from the team?")) return;
    setBusyMemberKey(`${teamId}:${userId}`);
    setError(null);
    try {
      const updated = await administrationApi.removeTeamMember(teamId, userId);
      setDetailById((prev) => ({ ...prev, [teamId]: updated }));
      await loadTeams();
    } catch {
      setError("Could not remove member (team owner cannot be removed).");
    } finally {
      setBusyMemberKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
          <p className="mt-1 text-sm text-gray-600">
            Organize people into teams and departments. Aliases appear as short codes (for example{" "}
            <span className="font-mono text-xs">@ENG</span>).
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex shrink-0 items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + Create team
        </button>
      </header>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {menuTeamId ? (
        <button
          type="button"
          className="fixed inset-0 z-40 cursor-default bg-transparent"
          aria-label="Close menu"
          onClick={() => setMenuTeamId(null)}
        />
      ) : null}

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            Loading teams…
          </div>
        ) : teams.length === 0 ? (
          <div className="py-16 text-center">
            <UsersRound className="mx-auto h-12 w-12 text-gray-300" aria-hidden />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No teams yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
              Create teams to organize people into departments and cross-functional groups.
            </p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              + Create team
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Team name</th>
                  <th className="px-4 py-3">Alias</th>
                  <th className="px-4 py-3">Members</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => {
                  const detail = detailById[team.id];
                  return (
                    <Fragment key={team.id}>
                      <tr
                        className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                        onClick={() => void toggleExpand(team.id)}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">{team.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">@{team.shortCode || "—"}</td>
                        <td className="px-4 py-3 text-gray-600">{team.memberCount}</td>
                        <td className="relative px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="inline-flex rounded p-1 text-gray-500 hover:bg-gray-100"
                            aria-label="Team actions"
                            onClick={() => setMenuTeamId((id) => (id === team.id ? null : team.id))}
                          >
                            <MoreHorizontal className="h-5 w-5" />
                          </button>
                          {menuTeamId === team.id ? (
                            <div className="absolute right-4 z-50 mt-1 w-44 rounded-md border border-gray-200 bg-white py-1 text-left shadow-lg">
                              <button
                                type="button"
                                className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                onClick={() => openEdit(team)}
                              >
                                Edit team
                              </button>
                              <button
                                type="button"
                                className="block w-full px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                                onClick={() => void onDeleteTeam(team)}
                              >
                                Archive team
                              </button>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                      {expandedTeamId === team.id ? (
                        <tr className="border-b border-gray-100 bg-slate-50/80">
                          <td colSpan={4} className="px-4 py-4">
                            {detailLoadingId === team.id ? (
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading members…
                              </div>
                            ) : detail ? (
                              <div className="space-y-3">
                                <ul className="space-y-2">
                                  {(detail.members || []).map((m) => {
                                    const label = displayNameFromUser(m.user);
                                    return (
                                      <li
                                        key={m.id}
                                        className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2"
                                      >
                                        <div className="flex min-w-0 items-center gap-3">
                                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
                                            {initials(label)}
                                          </div>
                                          <div className="min-w-0">
                                            <div className="truncate font-medium text-gray-900">{label}</div>
                                            <div className="text-xs text-gray-500">{m.user?.email}</div>
                                          </div>
                                          <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                                            {roleLabel(m.role)}
                                          </span>
                                        </div>
                                        {m.role.toUpperCase() !== "OWNER" ? (
                                          <button
                                            type="button"
                                            disabled={busyMemberKey === `${team.id}:${m.userId}`}
                                            className="text-xs text-red-600 hover:underline disabled:opacity-40"
                                            onClick={() => void onRemoveMember(team.id, m.userId)}
                                          >
                                            Remove
                                          </button>
                                        ) : (
                                          <span className="text-xs text-gray-400">Owner</span>
                                        )}
                                      </li>
                                    );
                                  })}
                                </ul>
                                {addMemberTeamId === team.id ? (
                                  <div className="rounded-md border border-indigo-200 bg-white p-3">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-xs font-medium text-gray-700">Search people</span>
                                      <button
                                        type="button"
                                        className="text-gray-400 hover:text-gray-600"
                                        onClick={() => {
                                          setAddMemberTeamId(null);
                                          setUserSearch("");
                                          setUserHits([]);
                                        }}
                                        aria-label="Close add member"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </div>
                                    <input
                                      type="text"
                                      value={userSearch}
                                      onChange={(e) => setUserSearch(e.target.value)}
                                      placeholder="Name or email (min 2 characters)…"
                                      className="mt-2 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                                    />
                                    {userSearchLoading ? (
                                      <p className="mt-2 text-xs text-gray-500">Searching…</p>
                                    ) : userHits.length > 0 ? (
                                      <ul className="mt-2 max-h-40 overflow-y-auto rounded border border-gray-100 bg-gray-50">
                                        {userHits.map((u) => (
                                          <li key={u.id}>
                                            <button
                                              type="button"
                                              className="flex w-full items-center justify-between px-2 py-2 text-left text-sm hover:bg-white"
                                              disabled={busyMemberKey === `${team.id}:${u.id}`}
                                              onClick={() => void onAddMember(team.id, u.id)}
                                            >
                                              <span>
                                                {u.name}{" "}
                                                <span className="text-xs text-gray-500">({u.email})</span>
                                              </span>
                                              <span className="text-xs text-indigo-600">Add</span>
                                            </button>
                                          </li>
                                        ))}
                                      </ul>
                                    ) : userSearch.trim().length >= 2 ? (
                                      <p className="mt-2 text-xs text-gray-500">No matches.</p>
                                    ) : null}
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setAddMemberTeamId(team.id);
                                      setUserSearch("");
                                      setUserHits([]);
                                    }}
                                  >
                                    + Add member
                                  </button>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">Could not load members.</p>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalMode ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => {
            setModalMode(null);
            setEditingTeam(null);
          }}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-gray-900">
              {modalMode === "create" ? "Create team" : "Edit team"}
            </h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600">Name</label>
                <input
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Engineering"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600">Alias (short code)</label>
                <input
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 font-mono text-sm uppercase"
                  value={formShortCode}
                  onChange={(e) =>
                    setFormShortCode(
                      e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10),
                    )
                  }
                  placeholder="ENG"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600">Description (optional)</label>
                <textarea
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => {
                  setModalMode(null);
                  setEditingTeam(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                onClick={() => void submitModal()}
              >
                {saving ? "Saving…" : modalMode === "create" ? "Create" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
