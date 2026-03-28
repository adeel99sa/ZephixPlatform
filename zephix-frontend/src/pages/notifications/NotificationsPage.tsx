// ─────────────────────────────────────────────────────────────────────────────
// NotificationsPage — Sprint 3: Full notifications list with pagination
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { Bell, CheckCheck, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  type NotificationItem,
} from '@/features/notifications/api/useNotifications';

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

function priorityLabel(priority: string): { label: string; className: string } {
  switch (priority) {
    case 'urgent':
      return { label: 'Urgent', className: 'text-red-700 bg-red-50 border-red-200' };
    case 'high':
      return { label: 'High', className: 'text-amber-700 bg-amber-50 border-amber-200' };
    default:
      return { label: '', className: '' };
  }
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const { data: notificationsData, isLoading } = useNotifications({
    status: filter,
    limit: 20,
    cursor,
  });
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const notifications: NotificationItem[] =
    (notificationsData as any)?.items ?? (Array.isArray(notificationsData) ? notificationsData : []);
  const nextCursor: string | null = (notificationsData as any)?.nextCursor ?? null;

  const handleClick = useCallback(
    (n: NotificationItem) => {
      if (!n.isRead) {
        markAsRead.mutate(n.id);
      }
      const data = n.data || {};
      if (data.taskId && data.projectId && n.workspaceId) {
        navigate(`/workspaces/${n.workspaceId}/projects/${data.projectId}?task=${data.taskId}`);
      } else if (data.projectId && n.workspaceId) {
        navigate(`/workspaces/${n.workspaceId}/projects/${data.projectId}`);
      }
    },
    [markAsRead, navigate],
  );

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4" data-testid="notifications-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-500 mt-0.5">All your notifications in one place</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Filter toggle */}
          <div className="flex items-center bg-slate-100 rounded-md p-0.5">
            <button
              onClick={() => { setFilter('all'); setCursor(undefined); }}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                filter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              All
            </button>
            <button
              onClick={() => { setFilter('unread'); setCursor(undefined); }}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                filter === 'unread' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              Unread
            </button>
          </div>

          <button
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition-colors"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-pulse space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-3 px-4">
                  <div className="h-3 w-3 rounded-full bg-slate-200 mt-1" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-3/4 bg-slate-200 rounded" />
                    <div className="h-3 w-1/2 bg-slate-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {filter === 'unread'
                ? "You're all caught up."
                : 'Notifications will appear here when activity happens.'}
            </p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-slate-50">
              {notifications.map((n) => {
                const prio = priorityLabel(n.priority);
                return (
                  <li
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`px-5 py-4 hover:bg-slate-50 cursor-pointer transition-colors ${
                      !n.isRead ? 'bg-indigo-50/20' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Unread dot */}
                      <div className="flex-shrink-0 mt-1.5">
                        {!n.isRead ? (
                          <div className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                        ) : (
                          <div className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <p
                              className={`text-sm ${
                                !n.isRead ? 'font-semibold text-slate-900' : 'text-slate-700'
                              }`}
                            >
                              {n.title}
                            </p>
                            {prio.label && (
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${prio.className}`}
                              >
                                {prio.label}
                              </span>
                            )}
                          </div>
                          <span className="flex-shrink-0 text-xs text-slate-400">
                            {formatRelative(n.createdAt)}
                          </span>
                        </div>
                        {n.body && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{n.body}</p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Pagination */}
            {nextCursor && (
              <div className="px-5 py-3 border-t border-slate-100 text-center">
                <button
                  onClick={() => setCursor(nextCursor)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Load more
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
