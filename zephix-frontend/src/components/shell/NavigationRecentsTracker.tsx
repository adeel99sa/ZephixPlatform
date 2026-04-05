import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { useNavigationRecentsStore } from "@/state/navigationRecents.store";

/**
 * Records favoritable workspace/project/dashboard routes for the Favorites "+" recents menu.
 * Defers one tick so document.title can update after navigation.
 */
export function NavigationRecentsTracker() {
  const { pathname } = useLocation();
  const recordVisit = useNavigationRecentsStore((s) => s.recordVisit);

  useEffect(() => {
    const id = window.setTimeout(() => {
      recordVisit(pathname);
    }, 0);
    return () => window.clearTimeout(id);
  }, [pathname, recordVisit]);

  return null;
}
