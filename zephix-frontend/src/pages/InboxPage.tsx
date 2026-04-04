import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Inbox,
  ListChecks,
  CheckCircle2,
  AtSign,
  AlarmClock,
  Users,
} from "lucide-react";

import { request } from "@/lib/api";
import { useUIStore } from "@/stores/uiStore";
import { useAuth } from "@/state/AuthContext";
import { useWorkspaceStore } from "@/state/workspace.store";
import { useOrgHomeState } from "@/features/organizations/useOrgHomeState";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { isPlatformAdmin } from "@/utils/access";
import { WorkspaceCreateModal } from "@/features/workspaces/WorkspaceCreateModal";
import { track } from "@/lib/telemetry";

interface Notification {
  id: string;
  eventType: string;
  title: string;
  body: string | null;
  data: Record<string, any>;
  priority: string;
  createdAt: Date;
  read: boolean;
}

interface NotificationListResponse {
  notifications: Notification[];
  nextCursor: string | null;
}

const INBOX_MODULES: {
  id: string;
  title: string;
  description: string;
  icon: typeof ListChecks;
}[] = [
  {
    id: "assignments",
    title: "Assignments",
    description:
      "Work routed to you across projects will surface here as the assignment model matures.",
    icon: ListChecks,
  },
  {
    id: "approvals",
    title: "Approvals",
    description:
      "Pending approvals and sign-offs will appear when governance workflows are connected.",
    icon: CheckCircle2,
  },
  {
    id: "mentions",
    title: "Mentions",
    description:
      "@mentions and directed comments will be grouped here; notification feed below already captures many events.",
    icon: AtSign,
  },
  {
    id: "reminders",
    title: "Reminders",
    description:
      "Scheduled reminders and nudges will show in this lane once enabled for your org.",
    icon: AlarmClock,
  },
  {
    id: "activity",
    title: "Shared activity",
    description:
      "Cross-workspace highlights and shared artifacts will aggregate here over time.",
    icon: Users,
  },
];

export default function InboxPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { addToast } = useUIStore();
  const { setActiveWorkspace } = useWorkspaceStore();
  const { workspaceCount, isLoading: orgLoading } = useOrgHomeState();
  const { unreadCount, refresh: refreshUnreadCount } = useUnreadNotifications();
  const isAdmin = isPlatformAdmin(user);

  const [tab, setTab] = useState<"all" | "unread">("all");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const showSetupBanner = !orgLoading && workspaceCount === 0;

  useEffect(() => {
    track("inbox_viewed", {});
  }, []);

  useEffect(() => {
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const loadNotifications = async (cursor?: string | null) => {
    try {
      setLoading(true);
      const status = tab === "unread" ? "unread" : "all";
      const params = new URLSearchParams({ status, limit: "20" });
      if (cursor) params.append("cursor", cursor);
      const data = await request.get<NotificationListResponse>(
        `/notifications?${params.toString()}`
      );
      if (cursor) {
        setNotifications((prev) => [...prev, ...data.notifications]);
      } else {
        setNotifications(data.notifications);
      }
      setNextCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);
    } catch (error) {
      addToast({
        type: "error",
        title: "Failed to load notifications",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await request.post(`/notifications/${notificationId}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      refreshUnreadCount();
    } catch (error) {
      addToast({
        type: "error",
        title: "Failed to mark as read",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await request.post("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      refreshUnreadCount();
      addToast({ type: "success", title: "All notifications marked as read" });
    } catch (error) {
      addToast({
        type: "error",
        title: "Failed to mark all as read",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleWorkspaceCreated = (workspaceId: string) => {
    setActiveWorkspace(workspaceId);
    setShowCreateModal(false);
    track("workspace.created.from_inbox", { workspaceId });
  };

  const filteredNotifications =
    tab === "unread" ? notifications.filter((n) => !n.read) : notifications;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6" data-testid="inbox-page">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Inbox className="h-6 w-6 text-slate-500" />
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Inbox</h1>
          {unreadCount > 0 && (
            <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
              {unreadCount > 99 ? "99+" : unreadCount} unread
            </span>
          )}
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
          Operational feed for notifications plus dedicated lanes for assignments, approvals,
          mentions, reminders, and shared activity as each module goes live.
        </p>
      </header>

      <section
        aria-label="Inbox modules"
        className="grid gap-3 sm:grid-cols-2"
        data-testid="inbox-modules"
      >
        {INBOX_MODULES.map((m) => {
          const Icon = m.icon;
          return (
            <article
              key={m.id}
              className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm"
              data-testid={`inbox-module-${m.id}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <Icon className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-slate-900">{m.title}</h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{m.description}</p>
                  <p className="mt-2 text-xs font-medium text-slate-400">Nothing to show yet</p>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section
        className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
        data-testid="inbox-feed"
      >
        <div className="border-b border-slate-200/80 bg-slate-50/50 px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Notifications</h2>
              {unreadCount > 0 && (
                <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-medium text-white">
                  {unreadCount}
                </span>
              )}
            </div>
            {tab === "all" && notifications.some((n) => !n.read) && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
              >
                Mark all as read
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-1 border-b border-slate-200/80 px-6">
          <button
            type="button"
            onClick={() => setTab("all")}
            className={`px-3 py-2.5 text-sm font-medium transition ${
              tab === "all"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setTab("unread")}
            className={`px-3 py-2.5 text-sm font-medium transition ${
              tab === "unread"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Unread{unreadCount > 0 ? ` (${unreadCount})` : ""}
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {loading && notifications.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">Loading…</div>
          ) : filteredNotifications.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Bell className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-slate-900">
                {tab === "unread" ? "No unread notifications" : "No notifications yet"}
              </h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                {tab === "unread"
                  ? "You're all caught up."
                  : "When teammates mention you, assign work, or trigger approvals, entries will appear here."}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start justify-between gap-4 px-6 py-4 ${
                  !notification.read ? "bg-blue-50/40" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm ${
                      !notification.read
                        ? "font-semibold text-slate-900"
                        : "text-slate-700"
                    }`}
                  >
                    {notification.title}
                  </p>
                  {notification.body && (
                    <p className="mt-0.5 text-sm text-slate-500">{notification.body}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(notification.createdAt).toLocaleString()}
                  </p>
                </div>
                {!notification.read && (
                  <button
                    type="button"
                    onClick={() => handleMarkAsRead(notification.id)}
                    className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
                  >
                    Mark read
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {hasMore && (
          <div className="border-t border-slate-100 px-6 py-3 text-center">
            <button
              type="button"
              onClick={() => {
                if (nextCursor && !loading) loadNotifications(nextCursor);
              }}
              disabled={loading}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition"
            >
              {loading ? "Loading…" : "Load more"}
            </button>
          </div>
        )}
      </section>

      {showSetupBanner && (
        <section
          className="rounded-xl border border-slate-200/90 bg-slate-50/80 px-4 py-3 text-sm text-slate-800"
          data-testid="inbox-setup-banner"
        >
          <p className="font-semibold text-slate-900">No workspace yet</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Create your first workspace to unlock projects and workspace-scoped notifications. This
            banner is secondary — modules and notifications above are your operational Inbox.
          </p>
          {isAdmin && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
                data-testid="inbox-create-workspace"
              >
                Create workspace
              </button>
              <button
                type="button"
                onClick={() => nav("/administration/users")}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                data-testid="inbox-invite-members"
              >
                Invite members
              </button>
            </div>
          )}
        </section>
      )}

      <WorkspaceCreateModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleWorkspaceCreated}
      />
    </div>
  );
}
