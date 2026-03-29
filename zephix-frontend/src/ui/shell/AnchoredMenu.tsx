import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AnchoredMenuItem = {
  id: string;
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  hidden?: boolean;
  /** Visual separator line above this item */
  divider?: boolean;
  /** Description shown below the label (smaller text) */
  description?: string;
  /** Submenu items — renders a flyout to the right on hover */
  children?: AnchoredMenuItem[];
  /** Danger styling (red text) */
  danger?: boolean;
};

type AnchoredMenuProps = {
  items: AnchoredMenuItem[];
  /** Render-prop that receives click handler + ref to anchor the menu */
  trigger: (props: {
    ref: React.Ref<HTMLButtonElement>;
    onClick: (e: React.MouseEvent) => void;
    open: boolean;
  }) => React.ReactNode;
  /** Align menu to "left" or "right" edge of trigger. Default: "left" */
  align?: "left" | "right";
  /**
   * When true, position the dropdown so it straddles the trigger's right edge
   * (roughly 50% overlapping the sidebar, 50% extending into the content area).
   * Useful for menus triggered from near the right edge of a narrow panel.
   */
  straddleRight?: boolean;
  /** Close any sibling menus — call parent's "close others" callback */
  onOpen?: () => void;
  /** External signal to force-close this menu */
  forceClose?: boolean;
  /** Menu width class. Default: "w-56" */
  widthClass?: string;
  /** Bottom section rendered after all items (e.g. a "Sharing & Permissions" button) */
  footer?: React.ReactNode;
};

export function AnchoredMenu({
  items,
  trigger,
  align = "left",
  straddleRight = false,
  onOpen,
  forceClose,
  widthClass = "w-56",
  footer,
}: AnchoredMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Force-close from parent (one-menu-at-a-time)
  useEffect(() => {
    if (forceClose) setOpen(false);
  }, [forceClose]);

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setOpen((prev) => {
        if (!prev) onOpen?.();
        return !prev;
      });
    },
    [onOpen],
  );

  const closeMenu = useCallback(() => setOpen(false), []);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      const el = target instanceof Element ? target : null;
      if (
        menuRef.current?.contains(target) ||
        triggerRef.current?.contains(target) ||
        el?.closest("[data-anchored-submenu]")
      )
        return;
      setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const visibleItems = items.filter((i) => !i.hidden);

  // Compute position
  const rect = triggerRef.current?.getBoundingClientRect();
  const top = (rect?.bottom ?? 0) + 4;
  const menuWidth = 224; // w-56 = 224px
  let left: number;
  if (straddleRight) {
    const triggerCenter = (rect?.left ?? 0) + ((rect?.width ?? 0) / 2);
    left = triggerCenter - menuWidth * 0.3;
  } else if (align === "right") {
    left = (rect?.right ?? 0) - menuWidth;
  } else {
    left = (rect?.left ?? 0);
  }

  return (
    <>
      {trigger({ ref: triggerRef, onClick: handleToggle, open })}
      {open && visibleItems.length > 0
        ? createPortal(
            <div
              ref={menuRef}
              style={{
                position: "fixed",
                top,
                left,
                zIndex: 9999,
              }}
              className={`${widthClass} rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg animate-in fade-in zoom-in-95 duration-100`}
            >
              {visibleItems.map((item) => (
                <MenuItemRow
                  key={item.id}
                  item={item}
                  onClose={closeMenu}
                />
              ))}
              {footer ? (
                <>
                  <div className="mx-2 my-1 border-t border-slate-100" />
                  <div onClick={closeMenu}>{footer}</div>
                </>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

// ── Individual menu item (supports submenu on hover) ──

function MenuItemRow({
  item,
  onClose,
}: {
  item: AnchoredMenuItem;
  onClose: () => void;
}) {
  const [subOpen, setSubOpen] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const Icon = item.icon;
  const hasChildren = item.children && item.children.filter((c) => !c.hidden).length > 0;

  function cancelClose() {
    clearTimeout(timerRef.current);
  }
  function handleMouseEnter() {
    if (hasChildren) {
      cancelClose();
      timerRef.current = setTimeout(() => setSubOpen(true), 120);
    }
  }
  function handleMouseLeave() {
    cancelClose();
    timerRef.current = setTimeout(() => setSubOpen(false), 300);
  }

  return (
    <div
      ref={rowRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {item.divider ? (
        <div className="mx-2 my-1 border-t border-slate-100" />
      ) : null}
      <button
        type="button"
        onClick={() => {
          if (hasChildren) {
            setSubOpen((v) => !v);
          } else {
            onClose();
            item.onClick();
          }
        }}
        className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
          item.danger ? "text-red-600 hover:bg-red-50" : "text-slate-700"
        }`}
      >
        {Icon ? (
          <Icon className={`h-4 w-4 shrink-0 ${item.danger ? "text-red-400" : "text-slate-400"}`} />
        ) : null}
        <span className="flex-1 truncate">{item.label}</span>
        {hasChildren ? (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        ) : null}
      </button>

      {/* Submenu flyout */}
      {hasChildren && subOpen ? (
        <SubmenuFlyout
          parentRef={rowRef}
          items={item.children!.filter((c) => !c.hidden)}
          onClose={onClose}
          onMouseEnter={cancelClose}
          onMouseLeave={handleMouseLeave}
        />
      ) : null}
    </div>
  );
}

// ── Submenu flyout — portalled, positioned to the right of the parent row ──

function SubmenuFlyout({
  parentRef,
  items,
  onClose,
  onMouseEnter,
  onMouseLeave,
}: {
  parentRef: React.RefObject<HTMLDivElement | null>;
  items: AnchoredMenuItem[];
  onClose: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const rect = parentRef.current?.getBoundingClientRect();
  if (!rect || items.length === 0) return null;

  const top = rect.top - 4;
  const left = rect.right + 4;

  return createPortal(
    <div
      data-anchored-submenu
      style={{ position: "fixed", top, left, zIndex: 10000 }}
      className="w-56 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {items.map((child) => {
        const ChildIcon = child.icon;
        return (
          <div key={child.id}>
            {child.divider ? (
              <div className="mx-2 my-1 border-t border-slate-100" />
            ) : null}
            <button
              type="button"
              onClick={() => {
                // Fire onClick first, then close — ensures state updates aren't lost
                child.onClick();
                onClose();
              }}
              className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                child.danger ? "text-red-600 hover:bg-red-50" : "text-slate-700"
              }`}
            >
              {ChildIcon ? (
                <ChildIcon className={`h-4 w-4 shrink-0 ${child.danger ? "text-red-400" : "text-slate-400"}`} />
              ) : null}
              <span className="truncate">{child.label}</span>
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
