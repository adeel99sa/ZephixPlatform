import { useCallback, useEffect, useRef, useState } from 'react';

export type UseResizableSplitOptions = {
  /** localStorage key for persisted list pane width (px). */
  storageKey: string;
  defaultPx: number;
  minPx: number;
  /** Max width as fraction of container (e.g. 0.62). */
  maxFraction?: number;
  /** Hard max px cap when fraction not used. */
  maxPx?: number;
};

export type UseResizableSplitResult = {
  listPx: number;
  setListPx: (px: number) => void;
  splitRef: React.RefObject<HTMLDivElement>;
  onResizerPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  isDragging: boolean;
};

function readStored(key: string, fallback: number, minPx: number): number {
  if (typeof window === 'undefined') return fallback;
  const n = Number(window.localStorage.getItem(key));
  return Number.isFinite(n) && n >= minPx ? n : fallback;
}

/**
 * Reusable horizontal split (list | detail) with pointer drag + localStorage persistence.
 * Pattern extracted from InboxPage for ArtifactPage and future surfaces.
 */
export function useResizableSplit({
  storageKey,
  defaultPx,
  minPx,
  maxFraction = 0.62,
  maxPx = 720,
}: UseResizableSplitOptions): UseResizableSplitResult {
  const [listPx, setListPxState] = useState(() => readStored(storageKey, defaultPx, minPx));
  const [isDragging, setIsDragging] = useState(false);
  const splitRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startW: number; maxW: number } | null>(null);
  const listPxRef = useRef(listPx);
  listPxRef.current = listPx;

  const setListPx = useCallback(
    (px: number) => {
      const root = splitRef.current;
      const maxW = root
        ? Math.min(maxPx, Math.floor(root.getBoundingClientRect().width * maxFraction))
        : maxPx;
      const clamped = Math.max(minPx, Math.min(px, maxW));
      setListPxState(clamped);
      listPxRef.current = clamped;
    },
    [minPx, maxFraction, maxPx],
  );

  const onResizerPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const root = splitRef.current;
      if (!root) return;
      e.preventDefault();
      const maxW = Math.min(maxPx, Math.floor(root.getBoundingClientRect().width * maxFraction));
      dragRef.current = { startX: e.clientX, startW: listPxRef.current, maxW };
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [maxFraction, maxPx],
  );

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const next = d.startW + (ev.clientX - d.startX);
      setListPx(next);
    };

    const onUp = () => {
      dragRef.current = null;
      setIsDragging(false);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, String(listPxRef.current));
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [isDragging, setListPx, storageKey]);

  return {
    listPx,
    setListPx,
    splitRef,
    onResizerPointerDown,
    isDragging,
  };
}
