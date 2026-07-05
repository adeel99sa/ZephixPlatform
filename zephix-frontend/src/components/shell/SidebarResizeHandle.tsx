import { useEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';

type SidebarResizeHandleProps = {
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onReset: () => void;
  onClose: () => void;
  isDragging: boolean;
};

function SidebarResizeTooltip({ anchorRef }: { anchorRef: RefObject<HTMLElement | null> }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    setPos({
      top: rect.top + rect.height / 2,
      left: rect.right + 10,
    });
  }, [anchorRef]);

  if (!pos) return null;

  return createPortal(
    <div
      className="fixed z-[6000] pointer-events-none -translate-y-1/2"
      style={{ top: pos.top, left: pos.left }}
      data-testid="sidebar-resize-tooltip"
    >
      <div className="relative rounded-lg bg-slate-800 px-3 py-2.5 text-xs text-white shadow-lg">
        <div
          className="absolute right-full top-1/2 h-0 w-0 -translate-y-1/2"
          style={{
            borderTop: '6px solid transparent',
            borderBottom: '6px solid transparent',
            borderRight: '6px solid rgb(30 41 59)',
          }}
          aria-hidden
        />
        <ul className="space-y-1.5">
          <li className="flex min-w-[9.5rem] items-center justify-between gap-4">
            <span>Close</span>
            <span className="text-slate-400">⌘ \</span>
          </li>
          <li className="flex min-w-[9.5rem] items-center justify-between gap-4">
            <span>Resize</span>
            <span className="text-slate-400">Drag</span>
          </li>
          <li className="flex min-w-[9.5rem] items-center justify-between gap-4">
            <span>Reset</span>
            <span className="text-slate-400">Double-click</span>
          </li>
        </ul>
      </div>
    </div>,
    document.body,
  );
}

export function SidebarResizeHandle({
  onPointerDown,
  onReset,
  onClose,
  isDragging,
}: SidebarResizeHandleProps) {
  const handleRef = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key !== '\\' && e.key !== '|') return;
      e.preventDefault();
      onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <>
      <div
        ref={handleRef}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sidebar"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onDoubleClick={(e) => {
          e.preventDefault();
          onReset();
        }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onFocus={() => setHovering(true)}
        onBlur={() => setHovering(false)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            /* width keyboard nudge handled by parent if needed */
          }
        }}
        className="relative z-50 w-1 shrink-0 touch-none cursor-col-resize"
        data-testid="sidebar-resize-handle"
      >
        <span
          className={`absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-colors ${
            isDragging || hovering ? 'bg-blue-400' : 'bg-slate-200 hover:bg-slate-400'
          }`}
          aria-hidden
        />
        {/* Wider hit target without shifting layout */}
        <span className="absolute inset-y-0 -left-1.5 w-4" aria-hidden />
      </div>
      {hovering && !isDragging && <SidebarResizeTooltip anchorRef={handleRef} />}
    </>
  );
}
