/**
 * Dashboard card resize handle — drag to toggle between half and full width.
 *
 * Appears at the bottom-right corner of each card on hover.
 * Dragging right past the grid midpoint → colSpan: 2 (full width).
 * Dragging left past the grid midpoint → colSpan: 1 (half width).
 * Snaps to grid columns on mouseup.
 *
 * Visual feedback: cursor changes to col-resize, card gets a blue
 * border indicator while dragging.
 */
import { useCallback, useRef, useState } from 'react';

interface ResizeHandleProps {
  /** Current column span */
  colSpan: 1 | 2;
  /** Called when user finishes dragging — receives new colSpan */
  onResize: (colSpan: 1 | 2) => void;
  /** Only render for users with permission */
  visible: boolean;
}

export function ResizeHandle({ colSpan, onResize, visible }: ResizeHandleProps) {
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const cardEl = useRef<HTMLElement | null>(null);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Find the card container (parent with grid column class)
      const card = (e.target as HTMLElement).closest('[data-dashboard-card]') as HTMLElement | null;
      if (!card) return;

      cardEl.current = card;
      startX.current = e.clientX;
      startWidth.current = card.getBoundingClientRect().width;
      setDragging(true);

      // Get grid container width to calculate snap point
      const grid = card.parentElement;
      const gridWidth = grid?.getBoundingClientRect().width ?? window.innerWidth;
      const halfPoint = gridWidth * 0.6; // 60% threshold for snap

      const onMouseMove = (moveEvent: MouseEvent) => {
        // Visual feedback — show resize indicator
        card.style.opacity = '0.9';
        card.style.boxShadow = '0 0 0 2px #3b82f6';
      };

      const onMouseUp = (upEvent: MouseEvent) => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        setDragging(false);

        // Reset visual feedback
        if (cardEl.current) {
          cardEl.current.style.opacity = '';
          cardEl.current.style.boxShadow = '';
        }

        // Calculate new width based on drag distance
        const deltaX = upEvent.clientX - startX.current;
        const newWidth = startWidth.current + deltaX;

        // Snap to grid: if card is wider than 60% of grid → full width, else half
        const newSpan: 1 | 2 = newWidth > halfPoint ? 2 : 1;

        if (newSpan !== colSpan) {
          onResize(newSpan);
        }
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'col-resize';
    },
    [colSpan, onResize],
  );

  if (!visible) return null;

  return (
    <div
      onMouseDown={onMouseDown}
      className={`absolute bottom-0 right-0 z-10 flex h-6 w-6 cursor-col-resize items-center justify-center rounded-tl-md transition-opacity ${
        dragging
          ? 'opacity-100 bg-blue-100'
          : 'opacity-0 group-hover/card:opacity-100 bg-slate-100 hover:bg-blue-100'
      }`}
      title={colSpan === 1 ? 'Drag to expand' : 'Drag to shrink'}
      aria-label="Resize card"
    >
      {/* Grip dots */}
      <svg width="10" height="10" viewBox="0 0 10 10" className="text-slate-400">
        <circle cx="3" cy="3" r="1.2" fill="currentColor" />
        <circle cx="7" cy="3" r="1.2" fill="currentColor" />
        <circle cx="3" cy="7" r="1.2" fill="currentColor" />
        <circle cx="7" cy="7" r="1.2" fill="currentColor" />
      </svg>
    </div>
  );
}
