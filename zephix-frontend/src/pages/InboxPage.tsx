import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Bell,
  Check,
  ChevronLeft,
  Inbox,
  ListFilter,
  MoreHorizontal,
  RotateCcw,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { request } from "@/lib/api";
import { useUIStore } from "@/stores/uiStore";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { track } from "@/lib/telemetry";
import { buildTaskDeepLink } from "@/features/notifications/api/notificationMappers";
import { invalidateNotificationsQueryCache } from "@/features/notifications/api/useNotifications";

const INBOX_LIST_PX_KEY = "zephix-inbox-list-px";
const LIST_MIN = 260;
const LIST_MAX_FRAC = 0.62;

type InboxTab = "all" | "unread" | "dismissed";

interface Notification {
  id: string;
  eventType: string;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  priority: string;
  createdAt: Date | string;
  read: boolean;
  workspaceId?: string;
}

interface NotificationListResponse {
  notifications: Notification[];
  nextCursor: string | null;
  hasMore?: boolean;
}

function readStoredListPx(): number {
  if (typeof window === "undefined") return 380;
  const n = Number(window.localStorage.getItem(INBOX_LIST_PX_KEY));
  return Number.isFinite(n) && n >= LIST_MIN && n <= 560 ? n : 380;
}

function tabLabel(tab: InboxTab): string {
  if (tab === "unread") return "Unread";
  if (tab === "dismissed") return "Dismissed";
  return "All";
}

function BulkDismissConfirmDialog({
  open,
  count,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inbox-bulk-dismiss-title"
      data-testid="inbox-bulk-dismiss-dialog"
    >
      <button
        type="button"
        className="fixed inset-0 bg-slate-900/40"
        aria-label="Cancel dismiss"
        onClick={onCancel}
      />
      <div className="relative z-[101] w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
        <h2 id="inbox-bulk-dismiss-title" className="text-sm font-semibold text-slate-900">
          Dismiss {count} notification{count === 1 ? "" : "s"}?
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          Dismissed notifications stay available under the Dismissed filter and can be restored
          later.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="inbox-bulk-dismiss-confirm"
            onClick={onConfirm}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function NotificationOverflowMenu({
  notification,
  mode,
  onMarkRead,
  onDismiss,
  onRestore,
  align = "right",
}: {
  notification: Notification;
  mode: "active" | "dismissed";
  onMarkRead: (id: string) => void | Promise<void>;
  onDismiss: (id: string) => void | Promise<void>;
  onRestore: (id: string) => void | Promise<void>;
  align?: "left" | "right";
}) {
  return (
    <div
      className={`absolute top-full z-[130] mt-0.5 min-w-[13rem] rounded-lg border border-slate-200 bg-white py-1 shadow-md ${
        align === "right" ? "right-0" : "left-0"
      }`}
      role="menu"
      aria-label="Notification actions"
    >
      {mode === "active" && !notification.read && (
        <button
          type="button"
          role="menuitem"
          className="w-full px-3 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
          onClick={() => onMarkRead(notification.id)}
        >
          Mark as read
        </button>
      )}
      {mode === "active" ? (
        <button
          type="button"
          role="menuitem"
          className="w-full px-3 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
          onClick={() => onDismiss(notification.id)}
        >
          Dismiss from inbox
        </button>
      ) : (
        <button
          type="button"
          role="menuitem"
          data-testid={`inbox-restore-menu-${notification.id}`}
          className="w-full px-3 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
          onClick={() => onRestore(notification.id)}
        >
          Restore to inbox
        </button>
      )}
      <div
        role="menuitem"
        aria-disabled="true"
        className="cursor-default px-3 py-2 text-left"
      >
        <div className="text-sm font-medium text-slate-400">Flag for follow-up</div>
        <div className="mt-0.5 text-[11px] leading-snug text-slate-400">
          Coming soon — flagging needs a backend field and filter (Pass 2).
        </div>
      </div>
    </div>
  );
}

function OpenTaskButton({
  notification,
  onNavigate,
}: {
  notification: Notification;
  onNavigate: (path: string) => void;
}) {
  const path = buildTaskDeepLink({
    workspaceId: notification.workspaceId,
    data: notification.data,
  });
  const missing: string[] = [];
  if (!notification.workspaceId) missing.push("workspace");
  if (!notification.data?.projectId) missing.push("project");
  if (!notification.data?.taskId) missing.push("task");

  const tooltip =
    missing.length > 0
      ? `Open task unavailable — missing ${missing.join(", ")} link`
      : undefined;

  return (
    <button
      type="button"
      data-testid="inbox-open-task-btn"
      disabled={!path}
      title={tooltip}
      onClick={() => {
        if (path) onNavigate(path);
      }}
      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition disabled:cursor-not-allowed disabled:opacity-50"
    >
      Open task
    </button>
  );
}

export default function InboxPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();
  const { unreadCount, refresh: refreshUnreadCount } = useUnreadNotifications();

  const [tab, setTab] = useState<InboxTab>("all");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [hasDismissedItems, setHasDismissedItems] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [listPx, setListPx] = useState(readStoredListPx);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [filterMenuPos, setFilterMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);
  const [detailMenuOpen, setDetailMenuOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkDismissConfirmOpen, setBulkDismissConfirmOpen] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);

  const splitRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startW: number; maxW: number } | null>(null);
  const listPxRef = useRef(listPx);
  listPxRef.current = listPx;

  const [isMdUp, setIsMdUp] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => setIsMdUp(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    track("inbox_viewed", {});
  }, []);

  useEffect(() => {
    if (!filterMenuOpen && rowMenuOpenId === null && !detailMenuOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("[data-inbox-popover-root]")) return;
      if (el.closest("[data-testid='inbox-filter-menu']")) return;
      setFilterMenuOpen(false);
      setRowMenuOpenId(null);
      setDetailMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [filterMenuOpen, rowMenuOpenId, detailMenuOpen]);

  const probeDismissedItems = useCallback(async () => {
    try {
      const data = await request.get<NotificationListResponse>(
        "/notifications?status=dismissed&limit=1",
      );
      setHasDismissedItems(
        (data.notifications?.length ?? 0) > 0 || Boolean(data.nextCursor),
      );
    } catch {
      setHasDismissedItems(false);
    }
  }, []);

  const loadNotifications = useCallback(
    async (cursor?: string | null) => {
      try {
        setLoading(true);
        const status = tab;
        const params = new URLSearchParams({ status, limit: "20" });
        if (cursor) params.append("cursor", cursor);
        const data = await request.get<NotificationListResponse>(
          `/notifications?${params.toString()}`,
        );
        if (cursor) {
          setNotifications((prev) => [...prev, ...data.notifications]);
        } else {
          setNotifications(data.notifications);
        }
        setNextCursor(data.nextCursor);
        setHasMore(Boolean(data.nextCursor));
        if (tab === "all" && !cursor && (data.notifications?.length ?? 0) === 0) {
          await probeDismissedItems();
        }
        if (tab === "dismissed" && !cursor) {
          setHasDismissedItems((data.notifications?.length ?? 0) > 0 || Boolean(data.nextCursor));
        }
      } catch (error) {
        addToast({
          type: "error",
          title: "Failed to load notifications",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setLoading(false);
      }
    },
    [tab, addToast, probeDismissedItems],
  );

  useEffect(() => {
    void loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const invalidateBellCache = useCallback(() => {
    invalidateNotificationsQueryCache(queryClient);
  }, [queryClient]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await request.post(`/notifications/${notificationId}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
      );
      refreshUnreadCount();
      invalidateBellCache();
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
      invalidateBellCache();
      addToast({ type: "success", title: "All notifications marked as read" });
    } catch (error) {
      addToast({
        type: "error",
        title: "Failed to mark all as read",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const filteredNotifications =
    tab === "unread" ? notifications.filter((n) => !n.read) : notifications;

  const selected = selectedId
    ? filteredNotifications.find((n) => n.id === selectedId) ?? null
    : null;

  const allFilteredSelected =
    filteredNotifications.length > 0 &&
    filteredNotifications.every((n) => selectedIds.has(n.id));
  const someSelected = filteredNotifications.some((n) => selectedIds.has(n.id));
  const isDismissedView = tab === "dismissed";
  const overflowMode: "active" | "dismissed" = isDismissedView ? "dismissed" : "active";

  useEffect(() => {
    const el = selectAllRef.current;
    if (!el) return;
    el.indeterminate = someSelected && !allFilteredSelected;
  }, [someSelected, allFilteredSelected]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [tab]);

  useEffect(() => {
    if (selectedId && !filteredNotifications.some((n) => n.id === selectedId)) {
      setSelectedId(null);
      setMobileShowDetail(false);
    }
  }, [selectedId, filteredNotifications]);

  const persistListPx = useCallback(() => {
    try {
      window.localStorage.setItem(INBOX_LIST_PX_KEY, String(listPxRef.current));
    } catch {
      /* ignore */
    }
  }, []);

  const onResizerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const root = splitRef.current;
    if (!root) return;
    e.preventDefault();
    e.stopPropagation();
    const cw = root.getBoundingClientRect().width;
    const maxW = Math.max(LIST_MIN, cw * LIST_MAX_FRAC);
    dragRef.current = { startX: e.clientX, startW: listPxRef.current, maxW };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onResizerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const delta = e.clientX - d.startX;
    const next = Math.min(Math.max(d.startW + delta, LIST_MIN), d.maxW);
    listPxRef.current = next;
    setListPx(next);
  };

  const onResizerPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      dragRef.current = null;
      persistListPx();
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const selectNotification = (id: string) => {
    setRowMenuOpenId(null);
    setDetailMenuOpen(false);
    setSelectedId(id);
    setMobileShowDetail(true);
  };

  const closeRowMenu = () => setRowMenuOpenId(null);

  const openFilterMenu = () => {
    const rect = filterTriggerRef.current?.getBoundingClientRect();
    if (rect) {
      setFilterMenuPos({ top: rect.bottom + 4, left: Math.max(8, rect.right - 224) });
    }
    setFilterMenuOpen((v) => !v);
    setRowMenuOpenId(null);
    setDetailMenuOpen(false);
  };

  const applyTab = (next: InboxTab) => {
    setTab(next);
    setSelectedId(null);
    setSelectedIds(new Set());
    setMobileShowDetail(false);
    setFilterMenuOpen(false);
    track("inbox_filter", { filter: next });
  };

  const markReadAndCloseMenus = async (notificationId: string) => {
    await handleMarkAsRead(notificationId);
    closeRowMenu();
    setDetailMenuOpen(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(filteredNotifications.map((n) => n.id)));
  };

  const dismissByIds = async (ids: string[]) => {
    if (ids.length === 0) return;
    try {
      await request.patch<{ updated: number }>("/notifications/inbox-state", {
        notificationIds: ids,
        dismissed: true,
      });
      track("inbox_dismiss", { count: ids.length });
      setNotifications((prev) => prev.filter((n) => !ids.includes(n.id)));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      if (selectedId && ids.includes(selectedId)) {
        setSelectedId(null);
        setMobileShowDetail(false);
      }
      setRowMenuOpenId(null);
      setDetailMenuOpen(false);
      setHasDismissedItems(true);
      refreshUnreadCount();
      invalidateBellCache();
      addToast({
        type: "success",
        title: ids.length === 1 ? "Dismissed from inbox" : `${ids.length} dismissed from inbox`,
      });
    } catch (error) {
      addToast({
        type: "error",
        title: "Could not dismiss",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const restoreByIds = async (ids: string[]) => {
    if (ids.length === 0) return;
    try {
      await request.patch<{ updated: number }>("/notifications/inbox-state", {
        notificationIds: ids,
        dismissed: false,
      });
      setNotifications((prev) => prev.filter((n) => !ids.includes(n.id)));
      if (selectedId && ids.includes(selectedId)) {
        setSelectedId(null);
        setMobileShowDetail(false);
      }
      setRowMenuOpenId(null);
      setDetailMenuOpen(false);
      refreshUnreadCount();
      invalidateBellCache();
      addToast({
        type: "success",
        title: ids.length === 1 ? "Restored to inbox" : `${ids.length} restored to inbox`,
      });
    } catch (error) {
      addToast({
        type: "error",
        title: "Could not restore",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const requestBulkDismiss = () => {
    if (selectedIds.size === 0) return;
    setBulkDismissConfirmOpen(true);
  };

  const confirmBulkDismiss = async () => {
    const ids = Array.from(selectedIds);
    setBulkDismissConfirmOpen(false);
    await dismissByIds(ids);
  };

  const renderEmptyState = () => {
    if (tab === "unread") {
      return (
        <>
          <h2 className="mt-3 text-sm font-semibold text-slate-900">No unread notifications</h2>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
            You&apos;re all caught up.
          </p>
        </>
      );
    }
    if (tab === "dismissed") {
      return (
        <>
          <h2 className="mt-3 text-sm font-semibold text-slate-900">No dismissed notifications</h2>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
            Dismissed items will appear here so you can restore them later.
          </p>
        </>
      );
    }
    if (hasDismissedItems) {
      return (
        <>
          <h2 className="mt-3 text-sm font-semibold text-slate-900">You&apos;re all caught up</h2>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
            Your active inbox is empty. Previously dismissed notifications are still available.
          </p>
          <button
            type="button"
            data-testid="inbox-view-dismissed-link"
            onClick={() => applyTab("dismissed")}
            className="mt-3 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
          >
            View dismissed notifications
          </button>
        </>
      );
    }
    return (
      <>
        <h2 className="mt-3 text-sm font-semibold text-slate-900">No notifications yet</h2>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
          When teammates mention you, assign work, or trigger approvals, entries will appear here.
        </p>
      </>
    );
  };

  return (
    <div
      className="flex min-h-[calc(100dvh-3.5rem)] w-full min-w-0 flex-col bg-white"
      data-testid="inbox-page"
    >
      <BulkDismissConfirmDialog
        open={bulkDismissConfirmOpen}
        count={selectedIds.size}
        onConfirm={() => void confirmBulkDismiss()}
        onCancel={() => setBulkDismissConfirmOpen(false)}
      />

      <header
        className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 px-4 py-3 sm:px-5"
        data-testid="inbox-toolbar"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Inbox className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">Inbox</h1>
          {unreadCount > 0 && (
            <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
              {unreadCount > 99 ? "99+" : unreadCount} unread
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative" data-inbox-popover-root>
            <button
              ref={filterTriggerRef}
              type="button"
              data-testid="inbox-filter-trigger"
              aria-label="Filter notifications"
              aria-expanded={filterMenuOpen}
              aria-haspopup="menu"
              onClick={openFilterMenu}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                filterMenuOpen
                  ? "border-slate-300 bg-slate-50 text-slate-900"
                  : "border-slate-200/90 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <ListFilter className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
              <span className="hidden sm:inline">{tabLabel(tab)}</span>
            </button>
            {filterMenuOpen &&
              filterMenuPos &&
              typeof document !== "undefined" &&
              createPortal(
                <div
                  className="fixed z-[100] w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-md"
                  style={{ top: filterMenuPos.top, left: filterMenuPos.left }}
                  role="menu"
                  aria-label="Inbox filter"
                  data-testid="inbox-filter-menu"
                >
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Show
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
                    onClick={() => applyTab("all")}
                  >
                    {tab === "all" ? (
                      <Check className="h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                    ) : (
                      <span className="w-4 shrink-0" aria-hidden />
                    )}
                    All notifications
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
                    onClick={() => applyTab("unread")}
                  >
                    {tab === "unread" ? (
                      <Check className="h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                    ) : (
                      <span className="w-4 shrink-0" aria-hidden />
                    )}
                    Unread
                    {unreadCount > 0 ? (
                      <span className="ml-auto rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    data-testid="inbox-filter-dismissed"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
                    onClick={() => applyTab("dismissed")}
                  >
                    {tab === "dismissed" ? (
                      <Check className="h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                    ) : (
                      <span className="w-4 shrink-0" aria-hidden />
                    )}
                    Dismissed
                  </button>
                </div>,
                document.body,
              )}
          </div>
          {tab === "all" && notifications.some((n) => !n.read) && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
            >
              Mark all as read
            </button>
          )}
        </div>
      </header>

      {selectedIds.size > 0 && !isDismissedView && (
        <div
          className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900 px-4 py-2.5 text-white sm:px-5"
          data-testid="inbox-selection-bar"
        >
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="inbox-bulk-dismiss"
              onClick={requestBulkDismiss}
              className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-100 transition"
            >
              Dismiss ({selectedIds.size})
            </button>
            <button
              type="button"
              data-testid="inbox-clear-selection"
              onClick={() => setSelectedIds(new Set())}
              className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 transition"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div
        ref={splitRef}
        className="flex min-h-0 flex-1 flex-col md:flex-row md:overflow-hidden"
        data-testid="inbox-split"
      >
        <div
          className={`flex min-h-0 flex-col border-slate-200/80 md:border-r ${
            mobileShowDetail ? "hidden md:flex" : "flex min-h-[40vh] md:min-h-0"
          } md:shrink-0 ${isMdUp ? "" : "w-full"}`}
          style={
            isMdUp
              ? {
                  width: listPx,
                  minWidth: LIST_MIN,
                  maxWidth: "62%",
                }
              : undefined
          }
          data-testid="inbox-list-pane"
        >
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">Loading…</div>
            ) : filteredNotifications.length === 0 ? (
              <div className="px-4 py-10 text-center sm:px-5" data-testid="inbox-empty-state">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <Bell className="h-5 w-5" aria-hidden />
                </div>
                {renderEmptyState()}
              </div>
            ) : (
              <>
                {!isDismissedView && (
                  <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-4 py-2 sm:px-5">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      data-testid="inbox-select-all"
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      aria-label="Select all notifications on this page"
                    />
                    <span className="text-xs text-slate-600">Select all on this page</span>
                  </div>
                )}
                <ul className="divide-y divide-slate-100" role="listbox" aria-label="Notifications">
                  {filteredNotifications.map((notification) => {
                    const isSel = notification.id === selectedId;
                    const menuOpen = rowMenuOpenId === notification.id;
                    return (
                      <li
                        key={notification.id}
                        className={`group flex items-stretch ${
                          !notification.read
                            ? "border-l-2 border-l-blue-500"
                            : "border-l-2 border-l-transparent"
                        } ${isSel ? "bg-blue-50/60" : ""}`}
                      >
                        {!isDismissedView && (
                          <div className="flex shrink-0 items-start pt-3 pl-3 sm:pl-4">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(notification.id)}
                              onChange={() => toggleSelect(notification.id)}
                              onClick={(e) => e.stopPropagation()}
                              data-testid={`inbox-row-check-${notification.id}`}
                              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              aria-label={`Select ${notification.title}`}
                            />
                          </div>
                        )}
                        <button
                          type="button"
                          role="option"
                          aria-selected={isSel}
                          data-testid={`inbox-notification-row-${notification.id}`}
                          onClick={() => selectNotification(notification.id)}
                          className="min-w-0 flex-1 px-2 py-3 text-left transition hover:bg-slate-50/80 sm:pr-2"
                        >
                          <p
                            className={`text-sm ${
                              !notification.read
                                ? "font-semibold text-slate-900"
                                : "font-medium text-slate-700"
                            }`}
                          >
                            {notification.title}
                          </p>
                          {notification.body && (
                            <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                              {notification.body}
                            </p>
                          )}
                          <p className="mt-1 text-[11px] text-slate-400">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </button>
                        <div className="flex shrink-0 items-start gap-0.5 pt-2.5 pr-2 sm:pr-3">
                          {isDismissedView ? (
                            <button
                              type="button"
                              data-testid={`inbox-row-restore-${notification.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                void restoreByIds([notification.id]);
                              }}
                              className="rounded-md px-2 py-1 text-[11px] font-medium text-slate-600 opacity-0 transition hover:bg-slate-200/60 group-hover:opacity-100 focus:opacity-100"
                            >
                              Restore to inbox
                            </button>
                          ) : (
                            <button
                              type="button"
                              data-testid={`inbox-row-dismiss-${notification.id}`}
                              aria-label={`Dismiss ${notification.title}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                void dismissByIds([notification.id]);
                              }}
                              className="rounded-md p-1 text-slate-400 opacity-0 transition hover:bg-slate-200/60 hover:text-slate-600 group-hover:opacity-100 focus:opacity-100"
                            >
                              <X className="h-4 w-4" aria-hidden />
                            </button>
                          )}
                          <div className="relative" data-inbox-popover-root>
                            <button
                              type="button"
                              aria-label={`Actions for ${notification.title}`}
                              aria-expanded={menuOpen}
                              aria-haspopup="menu"
                              data-testid={`inbox-notification-more-${notification.id}`}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={(e) => {
                                e.stopPropagation();
                                setFilterMenuOpen(false);
                                setDetailMenuOpen(false);
                                setRowMenuOpenId((id) =>
                                  id === notification.id ? null : notification.id,
                                );
                              }}
                              className="rounded-md p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600"
                            >
                              <MoreHorizontal className="h-4 w-4" aria-hidden />
                            </button>
                            {menuOpen && (
                              <NotificationOverflowMenu
                                notification={notification}
                                mode={overflowMode}
                                onMarkRead={() => markReadAndCloseMenus(notification.id)}
                                onDismiss={async (id) => {
                                  closeRowMenu();
                                  await dismissByIds([id]);
                                }}
                                onRestore={async (id) => {
                                  closeRowMenu();
                                  await restoreByIds([id]);
                                }}
                              />
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
            {hasMore && (
              <div className="border-t border-slate-100 px-4 py-3 text-center sm:px-5">
                <button
                  type="button"
                  onClick={() => {
                    if (nextCursor && !loading) void loadNotifications(nextCursor);
                  }}
                  disabled={loading}
                  className="rounded-lg px-4 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  {loading ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </div>
        </div>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize inbox list"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
            const root = splitRef.current;
            const cw = root?.getBoundingClientRect().width ?? 800;
            const maxW = Math.max(LIST_MIN, cw * LIST_MAX_FRAC);
            const step = 16;
            setListPx((w) => {
              const next =
                e.key === "ArrowLeft"
                  ? Math.max(LIST_MIN, w - step)
                  : Math.min(maxW, w + step);
              listPxRef.current = next;
              return next;
            });
            persistListPx();
          }}
          onPointerDown={onResizerPointerDown}
          onPointerMove={onResizerPointerMove}
          onPointerUp={onResizerPointerUp}
          onPointerCancel={onResizerPointerUp}
          className="relative hidden w-3 shrink-0 cursor-col-resize touch-none md:block"
          data-testid="inbox-split-resizer"
        >
          <span
            className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-slate-200 hover:bg-slate-400"
            aria-hidden
          />
        </div>

        <div
          className={`flex min-h-0 min-w-0 flex-1 flex-col bg-slate-50/40 ${
            mobileShowDetail ? "flex" : "hidden md:flex"
          }`}
          data-testid="inbox-detail-pane"
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <div className="flex shrink-0 items-center gap-2 border-b border-slate-200/80 bg-white px-4 py-2 md:hidden">
              <button
                type="button"
                onClick={() => setMobileShowDetail(false)}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                aria-label="Back to list"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            </div>
            {!selected ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
                <div className="text-slate-300">
                  <Inbox className="mx-auto h-16 w-16 stroke-1" strokeWidth={1} aria-hidden />
                </div>
                <p className="mt-4 text-sm font-medium text-slate-600">No notification selected</p>
                <p className="mt-1 max-w-xs text-xs text-slate-500">
                  Choose an item from the list to read the full message.
                </p>
              </div>
            ) : (
              <article className="flex flex-1 flex-col px-5 py-6 sm:px-8">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-semibold text-slate-900">{selected.title}</h2>
                    <p className="mt-1 text-xs text-slate-400">
                      {new Date(selected.createdAt).toLocaleString()}
                      {selected.eventType ? ` · ${selected.eventType}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {isDismissedView && (
                      <button
                        type="button"
                        data-testid="inbox-detail-restore"
                        onClick={() => void restoreByIds([selected.id])}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                        Restore to inbox
                      </button>
                    )}
                    <div className="relative" data-inbox-popover-root>
                      <button
                        type="button"
                        aria-label="Notification actions"
                        aria-expanded={detailMenuOpen}
                        aria-haspopup="menu"
                        data-testid="inbox-detail-more"
                        onClick={() => {
                          setFilterMenuOpen(false);
                          setRowMenuOpenId(null);
                          setDetailMenuOpen((v) => !v);
                        }}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600"
                      >
                        <MoreHorizontal className="h-4 w-4" aria-hidden />
                      </button>
                      {detailMenuOpen && (
                        <NotificationOverflowMenu
                          notification={selected}
                          mode={overflowMode}
                          onMarkRead={() => markReadAndCloseMenus(selected.id)}
                          onDismiss={async (id) => {
                            setDetailMenuOpen(false);
                            await dismissByIds([id]);
                          }}
                          onRestore={async (id) => {
                            setDetailMenuOpen(false);
                            await restoreByIds([id]);
                          }}
                          align="right"
                        />
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <OpenTaskButton notification={selected} onNavigate={navigate} />
                </div>
                {selected.body && (
                  <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                    {selected.body}
                  </div>
                )}
                {!selected.read && !isDismissedView && (
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={() => handleMarkAsRead(selected.id)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Mark as read
                    </button>
                  </div>
                )}
              </article>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
