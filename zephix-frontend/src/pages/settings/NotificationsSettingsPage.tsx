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

  return (
    <div className="p-6 space-y-6" data-testid="notifications-settings-page">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Notification Preferences</h1>
        <p className="text-gray-600">Control how you receive notifications</p>
      </div>

      {/* Channels */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Channels</h2>
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span>In-app notifications</span>
            <input
              type="checkbox"
              checked={preferences.channels.inApp}
              onChange={(e) => updateChannel("inApp", e.target.checked)}
              className="w-5 h-5"
            />
          </label>
          <label className="flex items-center justify-between">
            <span>Email notifications</span>
            <input
              type="checkbox"
              checked={preferences.channels.email}
              onChange={(e) => updateChannel("email", e.target.checked)}
              className="w-5 h-5"
            />
          </label>
        </div>
      </div>

      {/* Categories */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Categories</h2>
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span>Invites</span>
            <input
              type="checkbox"
              checked={preferences.categories.invites}
              onChange={(e) => updateCategory("invites", e.target.checked)}
              className="w-5 h-5"
            />
          </label>
          <label className="flex items-center justify-between">
            <span>Mentions</span>
            <input
              type="checkbox"
              checked={preferences.categories.mentions}
              onChange={(e) => updateCategory("mentions", e.target.checked)}
              className="w-5 h-5"
            />
          </label>
          <label className="flex items-center justify-between">
            <span>Assignments</span>
            <input
              type="checkbox"
              checked={preferences.categories.assignments}
              onChange={(e) => updateCategory("assignments", e.target.checked)}
              className="w-5 h-5"
            />
          </label>
          <label className="flex items-center justify-between">
            <span>Access changes</span>
            <input
              type="checkbox"
              checked={preferences.categories.accessChanges}
              onChange={(e) => updateCategory("accessChanges", e.target.checked)}
              className="w-5 h-5"
            />
          </label>
          <label className="flex items-center justify-between">
            <span>Risk alerts</span>
            <input
              type="checkbox"
              checked={preferences.categories.riskAlerts}
              onChange={(e) => updateCategory("riskAlerts", e.target.checked)}
              className="w-5 h-5"
            />
          </label>
          <label className="flex items-center justify-between">
            <span>Workflow</span>
            <input
              type="checkbox"
              checked={preferences.categories.workflow}
              onChange={(e) => updateCategory("workflow", e.target.checked)}
              className="w-5 h-5"
            />
          </label>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
