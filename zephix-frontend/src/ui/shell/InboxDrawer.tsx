import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Pin,
  PinOff,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/state/AuthContext";
import { inboxApi } from "@/features/inbox/api";
import type {
  InboxAction,
  InboxItem,
  InboxTab,
} from "@/features/inbox/types";
import { InboxListItem } from "@/features/inbox/components/InboxListItem";
import { InboxDetailPanel } from "@/features/inbox/components/InboxDetailPanel";
import { LoadingState } from "@/ui/components/LoadingState";

type InboxDrawerProps = {
  open: boolean;
  onClose: () => void;
  /** If pinned, the drawer stays open and pushes content rather than overlaying */
  pinned?: boolean;
  onPinChange?: (pinned: boolean) => void;
};

type DrawerFilter = "all" | "unread" | "archived";

const FILTER_OPTIONS: { id: DrawerFilter; label: string }[] = [
  { id: "all", label: "Unread & read" },
  { id: "unread", label: "Unread" },
  { id: "archived", label: "Archived" },
];

const MIN_WIDTH = 360;
const MAX_WIDTH = 720;
const DEFAULT_WIDTH = 480;

export function InboxDrawer({
  open,
  onClose,
  pinned = false,
  onPinChange,
}: InboxDrawerProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<DrawerFilter>("all");
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const filterBtnRef = useRef<HTMLButtonElement>(null);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<InboxItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState<InboxAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const canMutate =
    (user?.platformRole || user?.role || "").toUpperCase() !== "VIEWER";

  // ── Load inbox items ──
  const loadInbox = useCallback(async () => {
    if (!open) return;
    try {
      setLoading(true);
      setListError(null);
      const tab: InboxTab | undefined =
        filter === "archived" ? "cleared" : undefined;
      const status =
        filter === "unread" ? "unread" : undefined;
      const response = await inboxApi.list({
        tab,
        status,
        groupBy: "none",
        limit: 60,
        sort: "newest",
      });
      setItems(response.items || []);
    } catch (err: any) {
      setItems([]);
      setListError(err?.response?.data?.message || "Failed to load inbox.");
    } finally {
      setLoading(false);
    }
  }, [open, filter]);

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  // Reset selection when drawer closes
  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setSelectedItem(null);
      setActionError(null);
    }
  }, [open]);

  // ── Load detail ──
  useEffect(() => {
    if (!selectedId) {
      setSelectedItem(null);
      setDetailError(null);
      return;
    }
    let active = true;
    setDetailLoading(true);
    setDetailError(null);
    (async () => {
      try {
        const detail = await inboxApi.get(selectedId);
        if (active) setSelectedItem(detail);
      } catch (err: any) {
        if (active) {
          setSelectedItem(null);
          setDetailError(
            err?.response?.data?.message || "Failed to load item.",
          );
        }
      } finally {
        if (active) setDetailLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [selectedId]);

  // ── Actions ──
  const onMarkRead = async () => {
    if (!selectedId || !canMutate || actionPending) return;
    setActionPending("mark_read");
    setActionError(null);
    try {
      await inboxApi.markRead(selectedId);
      await loadInbox();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || "Action failed.");
    } finally {
      setActionPending(null);
    }
  };

  const onLater = async () => {
    if (!selectedId || !canMutate || actionPending) return;
    setActionPending("move_later");
    setActionError(null);
    try {
      await inboxApi.later(selectedId);
      await loadInbox();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || "Action failed.");
    } finally {
      setActionPending(null);
    }
  };

  const onClear = async () => {
    if (!selectedId || !canMutate || actionPending) return;
    setActionPending("clear");
    setActionError(null);
    try {
      await inboxApi.clear(selectedId);
      await loadInbox();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || "Action failed.");
    } finally {
      setActionPending(null);
    }
  };

  const onOpenSource = () => {
    if (!selectedItem?.deepLink) return;
    navigate(selectedItem.deepLink);
    onClose();
  };

  // ── Escape to close (when not pinned) ──
  useEffect(() => {
    if (!open || pinned) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedId) {
          setSelectedId(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, pinned, onClose, selectedId]);

  // ── Resize drag ──
  useEffect(() => {
    if (!isResizing) return;
    const parentRect = drawerRef.current?.parentElement?.getBoundingClientRect();
    const parentLeft = parentRect ? parentRect.left : 0;
    const onMouseMove = (e: MouseEvent) => {
      const newWidth = Math.min(
        MAX_WIDTH,
        Math.max(MIN_WIDTH, e.clientX - parentLeft),
      );
      setWidth(newWidth);
    };
    const onMouseUp = () => setIsResizing(false);
    document.body.style.cursor = "col-resize";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.body.style.cursor = "";
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [isResizing]);

  // ── Close filter menu on outside click ──
  useEffect(() => {
    if (!filterMenuOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        filterMenuRef.current?.contains(target) ||
        filterBtnRef.current?.contains(target)
      )
        return;
      setFilterMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [filterMenuOpen]);

  const unreadCount = useMemo(
    () => items.filter((i) => !i.read).length,
    [items],
  );

  if (!open) return null;

  return (
    <div
      ref={drawerRef}
      className="absolute left-0 top-0 z-20 flex h-full border-r border-slate-200 bg-white shadow-xl"
      style={{ width }}
    >
      {/* Resize handle — right edge */}
      <button
        type="button"
        onMouseDown={() => setIsResizing(true)}
        onDoubleClick={() => setWidth(DEFAULT_WIDTH)}
        className="absolute right-0 top-0 z-10 h-full w-1 cursor-col-resize bg-transparent hover:bg-blue-400/25"
        aria-label="Resize inbox panel"
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Inbox</h2>
          <div className="flex items-center gap-1">
            {/* Pin toggle */}
            {onPinChange ? (
              <button
                type="button"
                onClick={() => onPinChange(!pinned)}
                className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                title={pinned ? "Unpin inbox" : "Pin inbox open"}
              >
                {pinned ? (
                  <PinOff className="h-3.5 w-3.5" />
                ) : (
                  <Pin className="h-3.5 w-3.5" />
                )}
              </button>
            ) : null}

            {/* Collapse (close) */}
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              title="Close inbox"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </button>

            {/* Filter */}
            <div className="relative">
              <button
                ref={filterBtnRef}
                type="button"
                onClick={() => setFilterMenuOpen((v) => !v)}
                className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
                  filterMenuOpen
                    ? "bg-slate-100 text-slate-700"
                    : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                }`}
                title="Filter inbox"
              >
                <Filter className="h-3.5 w-3.5" />
              </button>

              {filterMenuOpen ? (
                <div
                  ref={filterMenuRef}
                  className="absolute right-0 top-full z-50 mt-1 w-52 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg"
                >
                  <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Filter
                  </div>
                  {FILTER_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setFilter(opt.id);
                        setFilterMenuOpen(false);
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      {opt.label}
                      {filter === opt.id ? (
                        <Check className="h-3.5 w-3.5 text-blue-600" />
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {selectedId ? (
            /* Detail view */
            <div className="flex flex-col p-4">
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="mb-3 inline-flex items-center gap-1 self-start text-xs text-slate-500 hover:text-slate-700"
              >
                <ChevronsLeft className="h-3 w-3" />
                Back to list
              </button>
              <InboxDetailPanel
                item={selectedItem}
                loading={detailLoading}
                error={detailError}
                actionError={actionError}
                canMutate={canMutate}
                pendingAction={actionPending}
                onMarkRead={() => void onMarkRead()}
                onLater={() => void onLater()}
                onClear={() => void onClear()}
                onOpenSource={onOpenSource}
                onRetry={() => setSelectedId(selectedId)}
              />
            </div>
          ) : loading ? (
            <LoadingState
              message="Loading inbox..."
              className="min-h-[200px]"
            />
          ) : listError ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <p className="text-sm font-medium text-slate-700">
                Unable to load inbox
              </p>
              <p className="mt-1 text-xs text-slate-500">{listError}</p>
              <button
                type="button"
                onClick={() => void loadInbox()}
                className="mt-3 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
              >
                Retry
              </button>
            </div>
          ) : items.length === 0 ? (
            /* Empty state */
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                <Check className="h-6 w-6 text-blue-500" />
              </div>
              <p className="text-sm font-medium text-slate-800">
                You're all caught up
              </p>
              <p className="mt-1 text-xs text-slate-500">
                You'll be notified here for
                <br />
                @mentions, page activity, and more
              </p>
            </div>
          ) : (
            /* List */
            <div className="space-y-1 p-3">
              {unreadCount > 0 ? (
                <p className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {unreadCount} unread
                </p>
              ) : null}
              {items.map((item) => (
                <InboxListItem
                  key={item.id}
                  item={item}
                  selected={selectedId === item.id}
                  onClick={() => {
                    setActionError(null);
                    setSelectedId(item.id);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
