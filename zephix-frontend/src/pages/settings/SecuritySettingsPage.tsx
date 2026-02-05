import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { request } from "@/lib/api";
import { useAuth } from "@/state/AuthContext";
import { useUIStore } from "@/stores/uiStore";

interface Session {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
  lastSeenAt: Date;
  isRevoked: boolean;
  isExpired: boolean;
  isActive: boolean;
}

export default function SecuritySettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useUIStore();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
    // Get current sessionId from storage
    const stored = localStorage.getItem("zephix.sessionId");
    if (stored) {
      setCurrentSessionId(stored);
    }
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await request.get<Session[]>("/auth/sessions");
      setSessions(data);
    } catch (error) {
      addToast({
        type: "error",
        title: "Failed to load sessions",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await request.post(`/auth/sessions/${sessionId}/revoke`);
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, isRevoked: true, isActive: false } : s
        )
      );

      // If revoking current session, logout
      if (sessionId === currentSessionId) {
        await logout();
        navigate("/login");
        addToast({
          type: "info",
          title: "Session revoked",
          message: "You have been logged out.",
        });
      } else {
        addToast({
          type: "success",
          title: "Session revoked",
          message: "The session has been revoked successfully.",
        });
      }
    } catch (error) {
      addToast({
        type: "error",
        title: "Failed to revoke session",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleRevokeOthers = async () => {
    try {
      // Backend uses auth context to identify current session
      // Send empty body - backend will use JWT to identify current session
      await request.post("/auth/sessions/revoke-others", {});
      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSessionId ? s : { ...s, isRevoked: true, isActive: false }
        )
      );
      addToast({
        type: "success",
        title: "Other sessions revoked",
        message: "All other sessions have been revoked.",
      });
    } catch (error) {
      addToast({
        type: "error",
        title: "Failed to revoke sessions",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const formatUserAgent = (userAgent: string | null) => {
    if (!userAgent) return "Unknown device";
    // Simple parsing - could be enhanced
    if (userAgent.includes("Chrome")) return "Chrome";
    if (userAgent.includes("Firefox")) return "Firefox";
    if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) return "Safari";
    if (userAgent.includes("Edge")) return "Edge";
    return userAgent.substring(0, 50);
  };

  const activeSessions = sessions.filter((s) => s.isActive);
  const otherSessions = activeSessions.filter((s) => s.id !== currentSessionId);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="security-settings-page">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Security</h1>
        <p className="text-gray-600">Manage your active sessions</p>
      </div>

      {otherSessions.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold">Other active sessions</h2>
              <p className="text-sm text-gray-600">
                {otherSessions.length} other session{otherSessions.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={handleRevokeOthers}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Revoke all others
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Device</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">IP Address</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Last Active</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Created</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sessions.map((session) => (
              <tr key={session.id} className={!session.isActive ? "opacity-50" : ""}>
                <td className="px-4 py-3 text-sm">
                  {formatUserAgent(session.userAgent)}
                  {session.id === currentSessionId && (
                    <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                      Current
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{session.ipAddress || "-"}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {new Date(session.lastSeenAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {new Date(session.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-sm">
                  {session.isActive && session.id !== currentSessionId && (
                    <button
                      onClick={() => handleRevokeSession(session.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Revoke
                    </button>
                  )}
                  {session.id === currentSessionId && (
                    <button
                      onClick={() => handleRevokeSession(session.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Revoke (logout)
                    </button>
                  )}
                  {!session.isActive && (
                    <span className="text-gray-400">Revoked</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
