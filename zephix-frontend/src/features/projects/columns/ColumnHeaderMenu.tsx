import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowUpDown,
  Calendar,
  CheckCircle,
  Hash,
  Tag,
  Type,
  User,
  Users,
} from 'lucide-react';

import { COLUMN_REGISTRY } from './column-registry';
import type { ProjectColumnKey } from './column-types';

/** Icon per column dataType — displayed before the label in headers. */
const COLUMN_ICONS: Record<string, React.FC<{ className?: string }>> = {
  text: Type,
  person: User,
  status: CheckCircle,
  date: Calendar,
  number: Hash,
  priority: Tag,
  tags: Tag,
  boolean: CheckCircle,
  relation: Users,
};

/** Scroll containers between trigger and document root (for reposition + clipping avoidance). */
function collectScrollParents(el: HTMLElement | null): HTMLElement[] {
  const out: HTMLElement[] = [];
  let p: HTMLElement | null = el?.parentElement ?? null;
  while (p) {
    const st = getComputedStyle(p);
    if (/(auto|scroll)/.test(`${st.overflow}${st.overflowY}${st.overflowX}`)) {
      out.push(p);
    }
    p = p.parentElement;
  }
  return out;
}

export interface ColumnHeaderMenuProps {
  columnKey: ProjectColumnKey;
  triggerRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  onSort: (key: ProjectColumnKey, direction: 'asc' | 'desc') => void;
  onGroup?: (key: ProjectColumnKey) => void;
  onHide?: (key: ProjectColumnKey) => void;
}

const MENU_Z = 200;

/**
 * Fixed-position portal menu under the header trigger — not clipped by `overflow-x-auto`.
 */
export const ColumnHeaderMenu: React.FC<ColumnHeaderMenuProps> = ({
  columnKey,
  triggerRef,
  onClose,
  onSort,
  onGroup,
  onHide,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    minWidth: number;
  } | null>(null);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const r = trigger.getBoundingClientRect();
    setCoords({
      top: r.bottom + 4,
      left: r.left,
      minWidth: Math.max(188, r.width),
    });
  }, [triggerRef]);

  useLayoutEffect(() => {
    updatePosition();
  }, [updatePosition, columnKey]);

  useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const scrollEls = collectScrollParents(trigger);
    const onScrollOrResize = () => updatePosition();
    for (const el of scrollEls) {
      el.addEventListener('scroll', onScrollOrResize, { capture: true });
    }
    window.addEventListener('scroll', onScrollOrResize, { capture: true });
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      for (const el of scrollEls) {
        el.removeEventListener('scroll', onScrollOrResize, { capture: true });
      }
      window.removeEventListener('scroll', onScrollOrResize, { capture: true });
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [updatePosition, triggerRef]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    const onMouse = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onMouse);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onMouse);
    };
  }, [onClose, triggerRef]);

  const col = COLUMN_REGISTRY[columnKey];

  const runSort = useCallback(
    (dir: 'asc' | 'desc') => {
      onSort(columnKey, dir);
      onClose();
    },
    [columnKey, onSort, onClose],
  );

  const runGroup = useCallback(() => {
    onGroup?.(columnKey);
    onClose();
  }, [columnKey, onGroup, onClose]);

  const runHide = useCallback(() => {
    onHide?.(columnKey);
    onClose();
  }, [columnKey, onHide, onClose]);

  const showGroup = col.groupable && onGroup;
  const showHide = col.hideable && onHide;

  if (coords === null) {
    return null;
  }

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      data-wf-header-menu="1"
      style={{
        position: 'fixed',
        top: coords.top,
        left: coords.left,
        minWidth: coords.minWidth,
        zIndex: MENU_Z,
      }}
      className="rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-800"
    >
      {col.sortable && col.sortLabels && (
        <>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/80"
            onClick={() => runSort('asc')}
          >
            {col.sortLabels[0]}
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/80"
            onClick={() => runSort('desc')}
          >
            {col.sortLabels[1]}
          </button>
        </>
      )}
      {showGroup && (
        <>
          <div className="my-1 h-px bg-slate-100 dark:bg-slate-600" />
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/80"
            onClick={runGroup}
          >
            Group by {col.label}
          </button>
        </>
      )}
      {showHide && (
        <>
          <div className="my-1 h-px bg-slate-100 dark:bg-slate-600" />
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center px-3 py-1.5 text-left text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
            onClick={runHide}
          >
            Hide column
          </button>
        </>
      )}
    </div>,
    document.body,
  );
};

export interface TableColumnHeaderProps {
  columnKey: ProjectColumnKey;
  label: string;
  className?: string;
  menuOpen: boolean;
  onMenuButtonClick: () => void;
  onRequestCloseMenu: () => void;
  onSort: (key: ProjectColumnKey, direction: 'asc' | 'desc') => void;
  onGroup?: (key: ProjectColumnKey) => void;
  onHide?: (key: ProjectColumnKey) => void;
}

/**
 * Interactive `<th>` aligned with static `Th` cells (`px-3 py-2 font-medium`).
 */
export const TableColumnHeader: React.FC<TableColumnHeaderProps> = ({
  columnKey,
  label,
  className = '',
  menuOpen,
  onMenuButtonClick,
  onRequestCloseMenu,
  onSort,
  onGroup,
  onHide,
}) => {
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <th
      className={`group/colhdr relative align-middle px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 ${className}`}
    >
      <button
        ref={triggerRef}
        type="button"
        data-wf-header-trigger={columnKey}
        className="flex w-full min-w-0 items-center gap-1.5"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={`${label} column options`}
        data-testid={`waterfall-header-trigger-${columnKey}`}
        onClick={(e) => {
          e.stopPropagation();
          onMenuButtonClick();
        }}
      >
        {(() => {
          const col = COLUMN_REGISTRY[columnKey];
          const Icon = col ? COLUMN_ICONS[col.dataType] : undefined;
          return Icon ? <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" /> : null;
        })()}
        <span className="truncate">{label}</span>
        {/* Sort icon — visible on hover only, shows "Sort" tooltip */}
        {COLUMN_REGISTRY[columnKey]?.sortable && (
          <span title="Sort">
            <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-slate-400 opacity-0 transition-opacity group-hover/colhdr:opacity-60 dark:text-slate-500" />
          </span>
        )}
      </button>
      {menuOpen && (
        <ColumnHeaderMenu
          columnKey={columnKey}
          triggerRef={triggerRef}
          onClose={onRequestCloseMenu}
          onSort={onSort}
          onGroup={onGroup}
          onHide={onHide}
        />
      )}
    </th>
  );
};
