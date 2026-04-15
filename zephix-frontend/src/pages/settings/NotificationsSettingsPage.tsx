import { useState, useEffect } from "react";
import { request } from "@/lib/api";
import { useUIStore } from "@/stores/uiStore";

interface NotificationPreferences {
  version: number;
  channels: {
    inApp: boolean;
    email: boolean;
    slack: boolean;
    teams: boolean;
  };
  categories: {
    invites: boolean;
    mentions: boolean;
    assignments: boolean;
    accessChanges: boolean;
    riskAlerts: boolean;
    workflow: boolean;
  };
  emailDigest: {
    enabled: boolean;
    frequency: "immediate" | "daily" | "weekly";
    quietHours: {
      enabled: boolean;
      start: string;
      end: string;
    };
  };
}

export default function NotificationsSettingsPage() {
  const { addToast } = useUIStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const data = await request.get<NotificationPreferences>("/users/me/notification-preferences");
      setPreferences(data);
    } catch (error) {
      addToast({
        type: "error",
        title: "Failed to load preferences",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!preferences) return;

    try {
      setSaving(true);
      const updated = await request.put<NotificationPreferences>(
        "/users/me/notification-preferences",
        preferences
      );
      setPreferences(updated);
      addToast({
        type: "success",
        title: "Preferences saved",
        message: "Your notification preferences have been updated.",
      });
    } catch (error) {
      addToast({
        type: "error",
        title: "Failed to save",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateChannel = (key: keyof NotificationPreferences["channels"], value: boolean) => {
    if (!preferences) return;
    setPreferences({
      ...preferences,
      channels: {
        ...preferences.channels,
        [key]: value,
      },
    });
  };

  const updateCategory = (key: keyof NotificationPreferences["categories"], value: boolean) => {
    if (!preferences) return;
    setPreferences({
      ...preferences,
      categories: {
        ...preferences.categories,
        [key]: value,
      },
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">Failed to load preferences</div>
      </div>
    );
  }

  const eventRows: { label: string; hint: string; key: keyof NotificationPreferences["categories"] }[] = [
    { label: "Task assigned", hint: "Assignments", key: "assignments" },
    { label: "Status changed & workflow", hint: "Workflow engine", key: "workflow" },
    { label: "Comments & mentions", hint: "Mentions", key: "mentions" },
    { label: "Due approaching, overdue, governance", hint: "Risk-style alerts", key: "riskAlerts" },
    { label: "Team & access changes", hint: "Directory updates", key: "accessChanges" },
    { label: "Workspace invite", hint: "Invitations", key: "invites" },
  ];

  return (
    <div className="space-y-8" data-testid="notifications-settings-page">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
        <p className="mt-1 text-sm text-gray-600">
          Master channels gate delivery. Event rows map to preference categories until per-channel
          routing ships in a later release.
        </p>
      </header>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Master toggles</h2>
        <p className="mt-1 text-sm text-gray-500">Turn channels off to stop that delivery path entirely.</p>
        <div className="mt-4 space-y-3">
          <label className="flex items-center justify-between rounded-md border border-gray-100 px-4 py-3">
            <span className="text-sm font-medium text-gray-900">Email</span>
            <input
              type="checkbox"
              checked={preferences.channels.email}
              onChange={(e) => updateChannel("email", e.target.checked)}
              className="h-5 w-5"
              aria-label="Email notifications master"
            />
          </label>
          <label className="flex items-center justify-between rounded-md border border-gray-100 px-4 py-3">
            <span className="text-sm font-medium text-gray-900">In-app</span>
            <input
              type="checkbox"
              checked={preferences.channels.inApp}
              onChange={(e) => updateChannel("inApp", e.target.checked)}
              className="h-5 w-5"
              aria-label="In-app notifications master"
            />
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Event grid</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="py-2 pr-4">Event</th>
                <th className="py-2 px-2 text-center">Email</th>
                <th className="py-2 px-2 text-center">In-app</th>
              </tr>
            </thead>
            <tbody>
              {eventRows.map((row) => (
                <tr key={row.key} className="border-b border-gray-100">
                  <td className="py-3 pr-4">
                    <p className="font-medium text-gray-900">{row.label}</p>
                    <p className="text-xs text-gray-500">{row.hint}</p>
                  </td>
                  <td className="py-3 text-center align-middle">
                    <input
                      type="checkbox"
                      disabled={!preferences.channels.email}
                      checked={preferences.categories[row.key]}
                      onChange={(e) => updateCategory(row.key, e.target.checked)}
                      className="h-4 w-4 disabled:opacity-40"
                      aria-label={`${row.label} email`}
                    />
                  </td>
                  <td className="py-3 text-center align-middle">
                    <input
                      type="checkbox"
                      disabled={!preferences.channels.inApp}
                      checked={preferences.categories[row.key]}
                      onChange={(e) => updateCategory(row.key, e.target.checked)}
                      className="h-4 w-4 disabled:opacity-40"
                      aria-label={`${row.label} in-app`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Email and In-app columns both reflect the same category toggle for now; independent
          per-channel routing is planned.
        </p>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
