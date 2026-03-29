import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/state/AuthContext";
import { persistLastVisitedRoute } from "@/features/navigation/last-visited";
import { useWorkspaceStore } from "@/state/workspace.store";

export function useLastVisitedRouteTracker() {
  const { user } = useAuth();
  const location = useLocation();
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);

  useEffect(() => {
    if (!user) return;
    const route = `${location.pathname}${location.search}${location.hash}`;
    persistLastVisitedRoute(route, activeWorkspaceId);
  }, [user, activeWorkspaceId, location.pathname, location.search, location.hash]);
}

