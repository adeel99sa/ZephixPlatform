import { useCallback } from 'react';

/**
 * Arrow-key roving for a single [role=tree] container (Sprint 5.2a sidebar artifacts).
 */
export function useTreeRovingKeydown() {
  return useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const tree = e.currentTarget;
    const items = Array.from(
      tree.querySelectorAll<HTMLElement>('[role="treeitem"]:not([disabled])'),
    );
    if (items.length === 0) return;

    const active = document.activeElement as HTMLElement | null;
    let idx = items.indexOf(active as HTMLElement);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = idx < items.length - 1 ? idx + 1 : 0;
      items[next]?.focus();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = idx > 0 ? idx - 1 : items.length - 1;
      items[next]?.focus();
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      items[0]?.focus();
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      items[items.length - 1]?.focus();
    }
  }, []);
}
