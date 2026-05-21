import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, ArrowUp, ChevronDown, EyeOff } from 'lucide-react';

export interface ColumnHeaderMenuProps {
  label: string;
  sortable?: boolean;
  hideable?: boolean;
  rollupEligible?: boolean;
  rollupEnabled?: boolean;
  onSortAsc?: () => void;
  onSortDesc?: () => void;
  onHide?: () => void;
  onToggleRollup?: () => void;
  canManageRollup?: boolean;
  className?: string;
  columnTestId?: string;
}

const MENU_Z = 200;

function MenuRow({
  icon,
  label,
  onClick,
  testId,
  trailing,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  testId?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      title={label}
      data-testid={testId}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/80"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <span className="shrink-0 text-slate-400">{icon}</span>
      <span className="min-w-0 flex-1">{label}</span>
      {trailing}
    </button>
  );
}

export function ColumnHeaderMenu({
  label,
  sortable = true,
  hideable = true,
  rollupEligible = false,
  rollupEnabled = false,
  onSortAsc,
  onSortDesc,
  onHide,
  onToggleRollup,
  canManageRollup = false,
  className = '',
  columnTestId,
}: ColumnHeaderMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; minWidth: number } | null>(
    null,
  );

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const r = trigger.getBoundingClientRect();
    setCoords({
      top: r.bottom + 4,
      left: r.left,
      minWidth: Math.max(200, r.width),
    });
  }, []);

  useLayoutEffect(() => {
    if (menuOpen) updatePosition();
  }, [menuOpen, updatePosition, label]);

  useEffect(() => {
    if (!menuOpen) return;
    const onScrollOrResize = () => updatePosition();
    window.addEventListener('scroll', onScrollOrResize, { capture: true });
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, { capture: true });
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [menuOpen, updatePosition]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeMenu();
      }
    };
    const onMouse = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      closeMenu();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onMouse);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onMouse);
    };
  }, [menuOpen, closeMenu]);

  const showRollup = rollupEligible && canManageRollup && onToggleRollup;
  const hasMenu =
    (sortable && (onSortAsc || onSortDesc)) ||
    (hideable && onHide) ||
    showRollup;

  const menuPortal =
    menuOpen && coords && hasMenu
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            data-testid={columnTestId ? `${columnTestId}-menu` : undefined}
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              minWidth: coords.minWidth,
              zIndex: MENU_Z,
            }}
            className="rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-800"
          >
            {sortable && onSortAsc && (
              <MenuRow
                icon={<ArrowUp className="h-3.5 w-3.5" />}
                label="Sort A → Z"
                testId={columnTestId ? `${columnTestId}-sort-asc` : undefined}
                onClick={() => {
                  onSortAsc();
                  closeMenu();
                }}
              />
            )}
            {sortable && onSortDesc && (
              <MenuRow
                icon={<ArrowDown className="h-3.5 w-3.5" />}
                label="Sort Z → A"
                testId={columnTestId ? `${columnTestId}-sort-desc` : undefined}
                onClick={() => {
                  onSortDesc();
                  closeMenu();
                }}
              />
            )}
            {hideable && onHide && (
              <>
                {(sortable && (onSortAsc || onSortDesc)) && (
                  <div className="my-1 h-px bg-slate-100 dark:bg-slate-600" />
                )}
                <MenuRow
                  icon={<EyeOff className="h-3.5 w-3.5" />}
                  label="Hide column"
                  testId={columnTestId ? `${columnTestId}-hide` : undefined}
                  onClick={() => {
                    onHide();
                    closeMenu();
                  }}
                />
              </>
            )}
            {showRollup && (
              <>
                <div className="my-1 h-px bg-slate-100 dark:bg-slate-600" />
                <MenuRow
                  icon={<span className="inline-block h-3.5 w-3.5" />}
                  label="Rollup from subtasks"
                  testId={columnTestId ? `${columnTestId}-rollup` : undefined}
                  onClick={() => onToggleRollup()}
                  trailing={
                    <span
                      role="switch"
                      aria-checked={rollupEnabled}
                      title={rollupEnabled ? 'Rollup on' : 'Rollup off'}
                      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition ${
                        rollupEnabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 translate-y-0.5 rounded-full bg-white shadow transition ${
                          rollupEnabled ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </span>
                  }
                />
              </>
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <th
      className={`group/colhdr relative align-middle px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 ${className}`}
    >
      <button
        ref={triggerRef}
        type="button"
        title={`${label} column options`}
        aria-haspopup={hasMenu ? 'menu' : undefined}
        aria-expanded={menuOpen}
        data-testid={columnTestId ?? undefined}
        className="flex w-full min-w-0 items-center gap-1"
        onClick={(e) => {
          e.stopPropagation();
          if (!hasMenu) return;
          setMenuOpen((o) => !o);
        }}
      >
        <span className="relative truncate">
          {rollupEnabled && (
            <span
              className="absolute -left-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-amber-500"
              aria-hidden
              title="Rollup from subtasks enabled"
            />
          )}
          {label}
        </span>
        {hasMenu && (
          <ChevronDown
            className="h-3 w-3 shrink-0 text-slate-400 opacity-0 transition-opacity group-hover/colhdr:opacity-100"
            aria-hidden
          />
        )}
      </button>
      {menuPortal}
    </th>
  );
}
