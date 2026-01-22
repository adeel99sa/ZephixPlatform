import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { useUIStore } from "@/stores/uiStore";
import { Bell } from "lucide-react";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";

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
  const { addToast } = useUIStore();
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const { unreadCount, refresh: refreshUnreadCount } = useUnreadNotifications();

  useEffect(() => {
    loadNotifications();
  }, [tab]);

  const loadNotifications = async (cursor?: string | null) => {
    try {
      setLoading(true);
      const status = tab === "unread" ? "unread" : "all";
      const params = new URLSearchParams({
        status,
        limit: "20",
      });
      if (cursor) {
        params.append("cursor", cursor);
      }

      const data = await api.get<NotificationListResponse>(`/notifications?${params.toString()}`);

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

  const handleLoadMore = () => {
    if (nextCursor && !loading) {
      loadNotifications(nextCursor);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await api.post(`/notifications/${notificationId}/read`);
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
      await api.post("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      refreshUnreadCount();
      addToast({
        type: "success",
        title: "All notifications marked as read",
      });
    } catch (error) {
      addToast({
        type: "error",
        title: "Failed to mark all as read",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [tab]);

  const filteredNotifications = tab === "unread"
    ? notifications.filter((n) => !n.read)
    : notifications;

  return (
    <div className="p-6 space-y-4" data-testid="inbox-page">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6" />
          <h1 className="text-2xl font-semibold">Inbox</h1>
          {unreadCount > 0 && (
            <span className="px-2 py-1 bg-red-600 text-white text-xs rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {tab === "all" && notifications.some((n) => !n.read) && (
          <button
            onClick={handleMarkAllAsRead}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setTab("all")}
          className={`px-4 py-2 ${
            tab === "all" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setTab("unread")}
          className={`px-4 py-2 ${
            tab === "unread" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"
          }`}
        >
          Unread {unreadCount > 0 && `(${unreadCount})`}
        </button>
      </div>

      {/* Notifications list */}
      <div className="space-y-2">
        {loading && notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {tab === "unread" ? "No unread notifications" : "No notifications"}
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 bg-white border rounded-lg ${
                !notification.read ? "border-blue-200 bg-blue-50" : "border-gray-200"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-semibold">{notification.title}</div>
                  {notification.body && (
                    <div className="text-sm text-gray-600 mt-1">{notification.body}</div>
                  )}
                  <div className="text-xs text-gray-400 mt-2">
                    {new Date(notification.createdAt).toLocaleString()}
                  </div>
                </div>
                {!notification.read && (
                  <button
                    onClick={() => handleMarkAsRead(notification.id)}
                    className="ml-4 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </div>
          ))
        )}

        {/* Load more */}
        {hasMore && (
          <div className="text-center py-4">
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
            >
              {loading ? "Loading..." : "Load more"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
