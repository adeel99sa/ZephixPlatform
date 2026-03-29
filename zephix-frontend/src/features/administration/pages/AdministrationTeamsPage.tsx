import { useEffect, useState } from "react";
import {
  teamsApi,
  type Team,
} from "@/features/admin/teams/api/teamsApi";

export default function AdministrationTeamsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [busyTeamId, setBusyTeamId] = useState<string | null>(null);

  const loadTeams = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await teamsApi.getTeams({
        // Keep active view aligned with governance page intent.
        status: "active",
      });
      setTeams(result);
    } catch {
      setTeams([]);
      setError("Failed to load teams.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTeams();
  }, []);

  const onCreateTeam = async () => {
    const name = window.prompt("Enter team name");
    if (!name?.trim()) return;
    setError(null);
    try {
      await teamsApi.createTeam({
        name: name.trim(),
        visibility: "public",
      });
      await loadTeams();
    } catch {
      setError("Failed to create team.");
    }
  };

  const onRenameTeam = async (team: Team) => {
    const name = window.prompt("Update team name", team.name);
    if (!name?.trim() || name.trim() === team.name) return;
    setBusyTeamId(team.id);
    setError(null);
    try {
      await teamsApi.updateTeam(team.id, { name: name.trim() });
      await loadTeams();
    } catch {
      setError("Failed to update team.");
    } finally {
      setBusyTeamId(null);
    }
  };

  const onArchiveTeam = async (team: Team) => {
    setBusyTeamId(team.id);
    setError(null);
    try {
      await teamsApi.deleteTeam(team.id);
      await loadTeams();
    } catch {
      setError("Failed to archive team.");
    } finally {
      setBusyTeamId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Teams</h1>
          <p className="mt-1 text-sm text-gray-600">
            Team governance with membership scope and ownership visibility.
          </p>
        </div>
        <button
          type="button"
          onClick={onCreateTeam}
          className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Create team
        </button>
      </header>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Visibility</th>
                <th className="px-4 py-3">Members</th>
                <th className="px-4 py-3">Projects</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-gray-500" colSpan={7}>
                    Loading teams...
                  </td>
                </tr>
              ) : teams.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-gray-500" colSpan={7}>
                    No teams available.
                  </td>
                </tr>
              ) : (
                teams.map((team) => (
                  <tr key={team.id} className="border-t border-gray-200 text-sm text-gray-700">
                    <td className="px-4 py-3 font-medium text-gray-900">{team.name}</td>
                    <td className="px-4 py-3">{team.shortCode}</td>
                    <td className="px-4 py-3 capitalize">{team.visibility}</td>
                    <td className="px-4 py-3">{team.memberCount}</td>
                    <td className="px-4 py-3">{team.projectCount}</td>
                    <td className="px-4 py-3 capitalize">{team.status}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={busyTeamId === team.id}
                          onClick={() => onRenameTeam(team)}
                          className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          disabled={busyTeamId === team.id || team.status === "archived"}
                          onClick={() => onArchiveTeam(team)}
                          className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                        >
                          Archive
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
    </div>
  );
}
