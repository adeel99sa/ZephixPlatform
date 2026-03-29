import { useEffect, useState } from "react";
import {
  administrationApi,
  type AccessControlSummary,
} from "@/features/administration/api/administration.api";

export default function AdministrationAccessControlPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<AccessControlSummary | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const payload = await administrationApi.getAccessControlSummary();
        if (!active) return;
        setSummary(payload);
      } catch {
        if (!active) return;
        setSummary(null);
        setError("Failed to load access control governance summary.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-gray-900">Access Control</h1>
        <p className="text-sm text-gray-600">
          Source-backed role model summary for platform and workspace governance
          boundaries.
        </p>
      </header>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Platform Roles</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Workspace Creation</th>
                <th className="px-4 py-3">Org Governance</th>
                <th className="px-4 py-3">Default Access</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-gray-500" colSpan={4}>
                    Loading platform role matrix...
                  </td>
                </tr>
              ) : !summary || summary.platformRoles.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-gray-500" colSpan={4}>
                    No platform role summary available.
                  </td>
                </tr>
              ) : (
                summary.platformRoles.map((role) => (
                  <tr key={role.role} className="border-t border-gray-200 text-sm text-gray-700">
                    <td className="px-4 py-3 font-medium text-gray-900">{role.role}</td>
                    <td className="px-4 py-3">
                      {role.canCreateWorkspaces ? "Allowed" : "Not allowed"}
                    </td>
                    <td className="px-4 py-3">
                      {role.canManageOrganizationGovernance ? "Allowed" : "Not allowed"}
                    </td>
                    <td className="px-4 py-3 capitalize">
                      {role.defaultAccessMode.replace("_", " ")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">Workspace Role Model</h2>
          {loading ? (
            <p className="mt-2 text-sm text-gray-500">Loading workspace role model...</p>
          ) : !summary || summary.workspaceRoles.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">
              No workspace role summary available.
            </p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm text-gray-700">
              {summary.workspaceRoles.map((role) => (
                <li
                  key={role.role}
                  className="rounded border border-gray-200 px-3 py-2"
                >
                  <p className="font-medium text-gray-900">{role.role}</p>
                  <p className="text-gray-600">
                    Hierarchy: {role.hierarchyRank} •{" "}
                    {role.mutable ? "Has write capabilities" : "Read-only"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">Role Mapping and Policy Notes</h2>
          {loading ? (
            <p className="mt-2 text-sm text-gray-500">Loading policy notes...</p>
          ) : !summary ? (
            <p className="mt-2 text-sm text-gray-500">No policy notes available.</p>
          ) : (
            <div className="mt-2 space-y-3 text-sm text-gray-700">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Legacy Role Mapping
                </p>
                {summary.roleMappings.length === 0 ? (
                  <p className="mt-1 text-gray-500">No role mappings available.</p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {summary.roleMappings.map((mapping) => (
                      <li key={`${mapping.legacyRole}-${mapping.normalizedRole}`}>
                        {mapping.legacyRole} → {mapping.normalizedRole}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Policy Notes
                </p>
                {summary.policyNotes.length === 0 ? (
                  <p className="mt-1 text-gray-500">No policy notes available.</p>
                ) : (
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {summary.policyNotes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
