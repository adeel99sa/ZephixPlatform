// ─────────────────────────────────────────────────────────────────────────────
// NotificationBell — Sprint 3: Header bell with unread badge + dropdown
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, Check, CheckCheck, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  useUnreadCount,
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  type NotificationItem,
} from '../api/useNotifications';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelative(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function priorityDot(priority: string): string {
  switch (priority) {
    case 'urgent':
      return 'bg-red-500';
    case 'high':
      return 'bg-amber-500';
    default:
      return 'bg-slate-300';
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Queries
  const { data: unreadCount = 0 } = useUnreadCount();
  const { data: notificationsData } = useNotifications({
    status: 'all',
    limit: 10,
  });
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const notifications: NotificationItem[] =
    (notificationsData as any)?.items ?? (Array.isArray(notificationsData) ? notificationsData : []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handler);
    }
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) {
      document.addEventListener('keydown', handler);
    }
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const handleNotificationClick = useCallback(
    (n: NotificationItem) => {
      // Mark as read
      if (!n.isRead) {
        markAsRead.mutate(n.id);
      }

      // Navigate to deep link if available
      const data = n.data || {};
      if (data.taskId && data.projectId && n.workspaceId) {
        navigate(
          `/workspaces/${n.workspaceId}/projects/${data.projectId}?task=${data.taskId}`,
        );
        setOpen(false);
      } else if (data.projectId && n.workspaceId) {
        navigate(`/workspaces/${n.workspaceId}/projects/${data.projectId}`);
        setOpen(false);
      }
    },
    [markAsRead, navigate],
  );

  const handleMarkAllRead = useCallback(() => {
    markAllAsRead.mutate();
  }, [markAllAsRead]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        data-testid="notification-bell"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-lg border border-slate-200 z-50 overflow-hidden"
          data-testid="notification-dropdown"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No notifications yet</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors ${
                      !n.isRead ? 'bg-indigo-50/30' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Priority indicator */}
                      <div className="flex-shrink-0 mt-1.5">
                        <div className={`h-2 w-2 rounded-full ${priorityDot(n.priority)}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <p
                            className={`text-sm truncate ${
                              !n.isRead ? 'font-medium text-slate-900' : 'text-slate-700'
                            }`}
                          >
                            {n.title}
                          </p>
                          <span className="flex-shrink-0 text-[11px] text-slate-400">
                            {formatRelative(n.createdAt)}
                          </span>
                        </div>
                        {n.body && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                        )}
                      </div>

                      {/* Read indicator */}
                      {!n.isRead && (
                        <div className="flex-shrink-0 mt-1.5">
                          <div className="h-2 w-2 rounded-full bg-indigo-500" />
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 px-4 py-2">
            <button
              onClick={() => {
                navigate('/notifications');
                setOpen(false);
              }}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 w-full justify-center py-1"
            >
              View All <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
