import { useEffect, useMemo, useState } from "react";
import { request } from "@/lib/api";
import { administrationApi } from "@/features/administration/api/administration.api";

type SessionRecord = {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastSeenAt: string;
  isRevoked: boolean;
  isExpired: boolean;
  isActive: boolean;
};

function formatDate(value?: string | null): string {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
}

function formatDevice(userAgent: string | null): string {
  if (!userAgent) return "Unknown device";
  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) return "Safari";
  if (userAgent.includes("Edge")) return "Edge";
  return "Browser session";
}

export default function AdministrationSecurityPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [health, setHealth] = useState<{ status?: string; database?: string } | null>(null);
  const [busySessionId, setBusySessionId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sessionRows, systemHealth] = await Promise.all([
        request.get<SessionRecord[]>("/auth/sessions"),
        administrationApi.getSystemHealth(),
      ]);
      setSessions(Array.isArray(sessionRows) ? sessionRows : []);
      setHealth(systemHealth || null);
    } catch {
      setError("Failed to load security posture.");
      setSessions([]);
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      await load();
      if (!active) return;
    })();
    return () => {
      active = false;
    };
  }, []);

  const activeSessions = useMemo(
    () => sessions.filter((session) => session.isActive && !session.isRevoked && !session.isExpired),
    [sessions],
  );

  const revokeSession = async (sessionId: string) => {
    setBusySessionId(sessionId);
    try {
      await request.post(`/auth/sessions/${sessionId}/revoke`);
      await load();
    } catch {
      setError("Failed to revoke session.");
    } finally {
      setBusySessionId(null);
    }
  };

  const revokeOtherSessions = async () => {
    setBusySessionId("revoke-others");
    try {
      await request.post("/auth/sessions/revoke-others", {});
      await load();
    } catch {
      setError("Failed to revoke other sessions.");
    } finally {
      setBusySessionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Security</h1>
        <p className="mt-1 text-sm text-gray-600">
          Organization security posture and active session visibility. Policy management such as SSO and authentication enforcement will appear here when backend contracts are enabled.
        </p>
      </header>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">Authentication</h2>
          <p className="mt-2 text-sm text-gray-700">
            Status: {loading ? "Loading..." : health?.status || "Unknown"}
          </p>
          <p className="mt-1 text-sm text-gray-700">
            Database: {loading ? "Loading..." : health?.database || "Unknown"}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            SSO and MFA policy administration is not yet source-backed in this phase.
          </p>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">Session controls</h2>
          <p className="mt-2 text-sm text-gray-700">
            {loading ? "Loading..." : `${activeSessions.length} active session(s)`}
          </p>
          <button
            type="button"
            disabled={loading || busySessionId === "revoke-others" || activeSessions.length <= 1}
            onClick={revokeOtherSessions}
            className="mt-3 rounded border border-gray-300 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Revoke all other sessions
          </button>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">Security policies</h2>
          <p className="mt-2 text-sm text-gray-700">
            Policy-level governance controls are limited to session revocation in the current contracts.
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Domain verification and identity policy management require dedicated backend governance endpoints.
          </p>
        </section>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Session inventory</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Device</th>
                <th className="px-4 py-3">IP Address</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Last Seen</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-gray-500" colSpan={5}>
                    Loading sessions...
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-gray-500" colSpan={5}>
                    No sessions available.
                  </td>
                </tr>
              ) : (
                sessions.map((session) => (
                  <tr key={session.id} className="border-t border-gray-200 text-sm text-gray-700">
                    <td className="px-4 py-3">{formatDevice(session.userAgent)}</td>
                    <td className="px-4 py-3">{session.ipAddress || "Unknown"}</td>
                    <td className="px-4 py-3">{formatDate(session.createdAt)}</td>
                    <td className="px-4 py-3">{formatDate(session.lastSeenAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={!session.isActive || busySessionId === session.id}
                        onClick={() => revokeSession(session.id)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Revoke
                      </button>
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
