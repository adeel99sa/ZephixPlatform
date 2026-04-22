/**
 * Pass 3 — Card hover action bar.
 * Shows action icons on card hover: Refresh, Full Screen, Filter, Settings, More.
 * Permission-aware: mutations require Owner/Admin.
 */
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  RefreshCw,
  Maximize2,
  Table2,
  Settings,
  MoreHorizontal,
  Trash2,
} from "lucide-react";

export interface CardActionBarProps {
  /** Card is visible (hovered) */
  visible: boolean;
  /** Can user mutate card config (Owner/Admin) */
  canMutate: boolean;
  /** Is this a default card (cannot be removed) */
  isDefault: boolean;
  /** Does this card support filters */
  hasFilters: boolean;
  /** Current column span (Pass 4) */
  colSpan?: 1 | 2;
  onRefresh: () => void;
  onFullScreen: () => void;
  onFilter?: () => void;
  onSettings?: () => void;
  onRemove?: () => void;
  /** Pass 4: resize callback */
  onResize?: (colSpan: 1 | 2) => void;
}

export function CardActionBar({
  visible,
  canMutate,
  isDefault,
  hasFilters,
  colSpan = 1,
  onRefresh,
  onFullScreen,
  onFilter,
  onSettings,
  onRemove,
  onResize,
}: CardActionBarProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const close = (e: MouseEvent) => {
      if (moreRef.current?.contains(e.target as Node)) return;
      if (menuRef.current?.contains(e.target as Node)) return;
      setMoreOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [moreOpen]);

  // Close more menu when hover leaves
  useEffect(() => {
    if (!visible) setMoreOpen(false);
  }, [visible]);

  const showMore = canMutate; // More menu for resize (all cards) + remove (added cards only)

  return (
    <div
      className={`flex items-center gap-0.5 transition-opacity duration-150 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <ActionIcon title="Refresh" onClick={onRefresh}>
        <RefreshCw className="h-3.5 w-3.5" />
      </ActionIcon>

      <ActionIcon title="Full screen" onClick={onFullScreen}>
        <Maximize2 className="h-3.5 w-3.5" />
      </ActionIcon>

      {hasFilters && onFilter && (
        <ActionIcon title="View data" onClick={onFilter}>
          <Table2 className="h-3.5 w-3.5" />
        </ActionIcon>
      )}

      {canMutate && onSettings && (
        <ActionIcon title="Settings" onClick={onSettings}>
          <Settings className="h-3.5 w-3.5" />
        </ActionIcon>
      )}

      {showMore && (
        <div className="relative">
          <ActionIcon
            title="More"
            onClick={() => setMoreOpen(!moreOpen)}
            ref={moreRef}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </ActionIcon>

          {moreOpen &&
            createPortal(
              <MoreMenu
                ref={menuRef}
                anchorRef={moreRef}
                colSpan={colSpan}
                canRemove={!isDefault && !!onRemove}
                onResize={(span) => {
                  setMoreOpen(false);
                  onResize?.(span);
                }}
                onRemove={() => {
                  setMoreOpen(false);
                  onRemove?.();
                }}
              />,
              document.body,
            )}
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ── */

import { forwardRef } from "react";

const ActionIcon = forwardRef<
  HTMLButtonElement,
  { title: string; onClick: () => void; children: React.ReactNode }
>(({ title, onClick, children }, ref) => (
  <button
    ref={ref}
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
    title={title}
    aria-label={title}
  >
    {children}
  </button>
));
ActionIcon.displayName = "ActionIcon";

import { Columns2, RectangleHorizontal } from "lucide-react";

const MoreMenu = forwardRef<
  HTMLDivElement,
  {
    anchorRef: React.RefObject<HTMLButtonElement | null>;
    colSpan: 1 | 2;
    canRemove: boolean;
    onResize: (span: 1 | 2) => void;
    onRemove: () => void;
  }
>(({ anchorRef, colSpan, canRemove, onResize, onRemove }, ref) => {
  const rect = anchorRef.current?.getBoundingClientRect();
  if (!rect) return null;

  return (
    <div
      ref={ref}
      className="fixed z-[5000] min-w-[12rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
      style={{
        top: rect.bottom + 4,
        left: Math.min(rect.left, window.innerWidth - 200),
      }}
    >
      {/* Resize options */}
      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        Card size
      </div>
      <button
        type="button"
        onClick={() => onResize(1)}
        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
          colSpan === 1 ? "font-medium text-blue-600 bg-blue-50" : "text-slate-700 hover:bg-slate-50"
        }`}
      >
        <Columns2 className="h-4 w-4" />
        Half width
      </button>
      <button
        type="button"
        onClick={() => onResize(2)}
        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
          colSpan === 2 ? "font-medium text-blue-600 bg-blue-50" : "text-slate-700 hover:bg-slate-50"
        }`}
      >
        <RectangleHorizontal className="h-4 w-4" />
        Full width
      </button>

      {canRemove && (
        <>
          <div className="my-1 border-t border-slate-100" />
          <button
            type="button"
            onClick={onRemove}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Remove from dashboard
          </button>
        </>
      )}
    </div>
  );
});
MoreMenu.displayName = "MoreMenu";
