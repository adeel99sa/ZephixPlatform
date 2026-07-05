import { useResizableSplit } from '@/hooks/use-resizable-split';

export const SIDEBAR_DEFAULT_PX = 288;
export const SIDEBAR_MIN_PX = 240;
export const SIDEBAR_MAX_PX = 480;
export const SIDEBAR_WIDTH_STORAGE_KEY = 'zephix-sidebar-width-px';

/** Left app sidebar width with drag persistence (DashboardLayout). */
export function useResizableSidebar() {
  return useResizableSplit({
    storageKey: SIDEBAR_WIDTH_STORAGE_KEY,
    defaultPx: SIDEBAR_DEFAULT_PX,
    minPx: SIDEBAR_MIN_PX,
    maxPx: SIDEBAR_MAX_PX,
    maxFraction: 0.42,
  });
}
