import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { request } from "@/lib/api";
import { useUIStore } from "@/stores/uiStore";
import { useAuth } from "@/state/AuthContext";
import { useWorkspaceStore } from "@/state/workspace.store";
import { useOrgHomeState } from "@/features/organizations/useOrgHomeState";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { isPlatformAdmin } from "@/utils/access";
import { WorkspaceCreateModal } from "@/features/workspaces/WorkspaceCreateModal";
import { track } from "@/lib/telemetry";
import { Bell, Inbox } from "lucide-react";

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

  useEffect(() => {
    track("inbox_viewed", {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const hasNotifications = filteredNotifications.length > 0;
  const showEmptyLanding = !orgLoading && workspaceCount === 0 && !hasNotifications;

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6" data-testid="inbox-page">
      {/* ── Empty landing: no workspaces, no notifications ── */}
      {showEmptyLanding && (
        <>
          <section
            className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm"
            data-testid="inbox-welcome"
          >
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Welcome to Zephix
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Inbox is your landing page. It stays simple on day one, then becomes the
              place for assignments, approvals, mentions, reminders, and shared activity.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
                  data-testid="inbox-create-workspace"
                >
                  Create Workspace
                </button>
              )}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => nav("/administration/users")}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                  data-testid="inbox-invite-members"
                >
                  Invite Members
                </button>
              )}
            </div>
          </section>

          {/* Getting started guidance */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Getting Started</h2>
            <div className="mt-4 space-y-3">
              <GettingStartedStep
                number="1"
                title="Create your first workspace"
                text="Set up the container where projects, dashboards, docs, and shared items will live."
              />
              <GettingStartedStep
                number="2"
                title="Invite members"
                text="Use the invite workflow from the profile menu to bring your team in."
              />
              <GettingStartedStep
                number="3"
                title="Create your first project"
                text="Start from a template after your workspace exists."
              />
              <GettingStartedStep
                number="4"
                title="Use dashboards when source data exists"
                text="Dashboards live under Workspaces. They become useful once projects and tasks provide data."
              />
            </div>
          </section>
        </>
      )}

      {/* ── Notification feed ── */}
      {!showEmptyLanding && (
        <section
          className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
          data-testid="inbox-feed"
        >
          <div className="border-b border-slate-200/80 bg-slate-50/50 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Inbox className="h-5 w-5 text-slate-500" />
                <h1 className="text-base font-semibold text-slate-900">Inbox</h1>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-medium text-white">
                    {unreadCount}
                  </span>
                )}
              </div>
              {tab === "all" && notifications.some((n) => !n.read) && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
                >
                  Mark all as read
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-slate-200/80 px-6">
            <button
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

          {/* Notification list */}
          <div className="divide-y divide-slate-100">
            {loading && notifications.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">Loading...</div>
            ) : filteredNotifications.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <Bell className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-slate-900">
                  {tab === "unread"
                    ? "No unread notifications"
                    : "Nothing in your inbox yet"}
                </h3>
                <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                  {tab === "unread"
                    ? "You're all caught up."
                    : "Approvals, mentions, assignments, and reminders will appear here once workspaces and projects are active."}
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
                onClick={() => {
                  if (nextCursor && !loading) loadNotifications(nextCursor);
                }}
                disabled={loading}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition"
              >
                {loading ? "Loading..." : "Load more"}
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

function GettingStartedStep({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-teal-500 text-xs font-semibold text-white shadow-sm">
        {number}
      </div>
      <div>
        <div className="text-sm font-semibold text-slate-800">{title}</div>
        <div className="mt-0.5 text-sm leading-relaxed text-slate-500">{text}</div>
      </div>
    </div>
  );
}
