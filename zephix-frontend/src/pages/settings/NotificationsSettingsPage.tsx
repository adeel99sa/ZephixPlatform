import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { SettingsToggle } from "@/features/administration/components/SettingsToggle";
import { request } from "@/lib/api";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";

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

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-2 border-b border-neutral-100 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-neutral-900">{title}</p>
        {description ? <p className="mt-0.5 text-sm text-neutral-600">{description}</p> : null}
      </div>
      <div className="flex shrink-0 justify-end sm:w-28">{children}</div>
    </div>
  );
}

export default function NotificationsSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const latestRef = useRef<NotificationPreferences | null>(null);

  const persist = useCallback(async (next: NotificationPreferences) => {
    setSaving(true);
    try {
      const updated = await request.put<NotificationPreferences>("/users/me/notification-preferences", next);
      setPreferences(updated);
      latestRef.current = updated;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save notification preferences");
      if (latestRef.current) {
        setPreferences(latestRef.current);
      }
    } finally {
      setSaving(false);
    }
  }, []);

  const debouncedPersist = useDebouncedCallback((next: NotificationPreferences) => {
    void persist(next);
  }, 400);

  const loadPreferences = useCallback(async () => {
    try {
      setLoading(true);
      const data = await request.get<NotificationPreferences>("/users/me/notification-preferences");
      setPreferences(data);
      latestRef.current = data;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load preferences");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPreferences();
  }, [loadPreferences]);

  const updatePreferences = useCallback(
    (updater: (prev: NotificationPreferences) => NotificationPreferences) => {
      setPreferences((prev) => {
        if (!prev) return prev;
        const next = updater(prev);
        debouncedPersist(next);
        return next;
      });
    },
    [debouncedPersist],
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-sm text-neutral-600">Loading notification settings…</div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="p-6">
        <div className="text-sm font-medium text-neutral-900">Could not load notification preferences.</div>
      </div>
    );
  }

  const eventRows: { label: string; hint: string; key: keyof NotificationPreferences["categories"] }[] = [
    { label: "Task assigned", hint: "Assignments and ownership changes", key: "assignments" },
    { label: "Status changed & workflow", hint: "Workflow and status updates", key: "workflow" },
    { label: "Comments & mentions", hint: "Mentions and discussions", key: "mentions" },
    { label: "Due approaching, overdue, governance", hint: "Risk and policy-related alerts", key: "riskAlerts" },
    { label: "Team & access changes", hint: "Directory and membership updates", key: "accessChanges" },
    { label: "Workspace invite", hint: "Invitations to workspaces", key: "invites" },
  ];

  const channelsDisabled = !preferences.channels.email && !preferences.channels.inApp;

  return (
    <div className="space-y-8" data-testid="notifications-settings-page">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Notifications</h1>
          <p className="mt-1 text-sm text-neutral-600">Decide when and how you want to be notified. Changes save automatically.</p>
        </div>
        {saving ? (
          <span className="text-xs font-medium text-neutral-500" aria-live="polite">
            Saving…
          </span>
        ) : null}
      </header>

      <section className="rounded-xl border border-neutral-200 bg-white px-4 py-2 shadow-sm sm:px-6">
        <h2 className="border-b border-neutral-100 px-0 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Channels
        </h2>
        <p className="py-2 text-sm text-neutral-600">
          Master switches control whether each channel can deliver notifications at all.
        </p>
        <SettingRow title="Email" description="Email notifications for your account.">
          <SettingsToggle
            id="ch-email"
            checked={preferences.channels.email}
            onCheckedChange={(v) =>
              updatePreferences((p) => ({
                ...p,
                channels: { ...p.channels, email: v },
              }))
            }
            aria-label="Email notifications"
          />
        </SettingRow>
        <SettingRow title="In-app" description="Toasts and in-product notification surfaces.">
          <SettingsToggle
            id="ch-inapp"
            checked={preferences.channels.inApp}
            onCheckedChange={(v) =>
              updatePreferences((p) => ({
                ...p,
                channels: { ...p.channels, inApp: v },
              }))
            }
            aria-label="In-app notifications"
          />
        </SettingRow>
        <SettingRow
          title="Slack"
          description="Slack delivery is prepared for a future integration; the preference is stored now."
        >
          <SettingsToggle
            id="ch-slack"
            checked={preferences.channels.slack}
            onCheckedChange={(v) =>
              updatePreferences((p) => ({
                ...p,
                channels: { ...p.channels, slack: v },
              }))
            }
            aria-label="Slack notifications"
          />
        </SettingRow>
        <SettingRow
          title="Microsoft Teams"
          description="Teams delivery is prepared for a future integration; the preference is stored now."
        >
          <SettingsToggle
            id="ch-teams"
            checked={preferences.channels.teams}
            onCheckedChange={(v) =>
              updatePreferences((p) => ({
                ...p,
                channels: { ...p.channels, teams: v },
              }))
            }
            aria-label="Microsoft Teams notifications"
          />
        </SettingRow>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white px-4 py-2 shadow-sm sm:px-6">
        <h2 className="border-b border-neutral-100 px-0 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Email digest
        </h2>
        <SettingRow
          title="Email digest"
          description="When enabled, non-immediate email can be batched by frequency below."
        >
          <SettingsToggle
            id="digest-enabled"
            checked={preferences.emailDigest.enabled}
            onCheckedChange={(v) =>
              updatePreferences((p) => ({
                ...p,
                emailDigest: { ...p.emailDigest, enabled: v },
              }))
            }
            aria-label="Email digest enabled"
            disabled={!preferences.channels.email}
          />
        </SettingRow>
        <div className="border-b border-neutral-100 py-4 last:border-b-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-900">Digest frequency</p>
              <p className="mt-0.5 text-sm text-neutral-600">How often bundled email may be sent when not immediate.</p>
            </div>
            <select
              className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 sm:mt-0 sm:max-w-[12rem]"
              value={preferences.emailDigest.frequency}
              disabled={!preferences.channels.email || !preferences.emailDigest.enabled}
              onChange={(e) =>
                updatePreferences((p) => ({
                  ...p,
                  emailDigest: {
                    ...p.emailDigest,
                    frequency: e.target.value as NotificationPreferences["emailDigest"]["frequency"],
                  },
                }))
              }
            >
              <option value="immediate">Immediate</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
        </div>
        <SettingRow
          title="Quiet hours"
          description="When enabled, digest timing can respect a quiet window (full enforcement ships with email worker)."
        >
          <SettingsToggle
            id="quiet-enabled"
            checked={preferences.emailDigest.quietHours.enabled}
            onCheckedChange={(v) =>
              updatePreferences((p) => ({
                ...p,
                emailDigest: {
                  ...p.emailDigest,
                  quietHours: { ...p.emailDigest.quietHours, enabled: v },
                },
              }))
            }
            aria-label="Quiet hours"
            disabled={!preferences.channels.email}
          />
        </SettingRow>
        <div className="flex flex-col gap-3 border-b border-neutral-100 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-medium text-neutral-900">Quiet window</span>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="time"
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm disabled:opacity-50"
              value={preferences.emailDigest.quietHours.start}
              disabled={!preferences.channels.email || !preferences.emailDigest.quietHours.enabled}
              onChange={(e) =>
                updatePreferences((p) => ({
                  ...p,
                  emailDigest: {
                    ...p.emailDigest,
                    quietHours: { ...p.emailDigest.quietHours, start: e.target.value },
                  },
                }))
              }
            />
            <span className="text-neutral-500">to</span>
            <input
              type="time"
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm disabled:opacity-50"
              value={preferences.emailDigest.quietHours.end}
              disabled={!preferences.channels.email || !preferences.emailDigest.quietHours.enabled}
              onChange={(e) =>
                updatePreferences((p) => ({
                  ...p,
                  emailDigest: {
                    ...p.emailDigest,
                    quietHours: { ...p.emailDigest.quietHours, end: e.target.value },
                  },
                }))
              }
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white px-4 py-2 shadow-sm sm:px-6">
        <h2 className="border-b border-neutral-100 px-0 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Events
        </h2>
        <p className="py-2 text-sm text-neutral-600">
          Choose which event types you want to receive. Delivery still respects channel masters above. Category toggles
          apply to both email and in-app until per-channel routing is available.
        </p>
        {eventRows.map((row) => (
          <SettingRow key={row.key} title={row.label} description={row.hint}>
            <SettingsToggle
              id={`cat-${row.key}`}
              checked={preferences.categories[row.key]}
              disabled={channelsDisabled}
              onCheckedChange={(v) =>
                updatePreferences((p) => ({
                  ...p,
                  categories: { ...p.categories, [row.key]: v },
                }))
              }
              aria-label={`${row.label} notifications`}
            />
          </SettingRow>
        ))}
      </section>
    </div>
  );
}
