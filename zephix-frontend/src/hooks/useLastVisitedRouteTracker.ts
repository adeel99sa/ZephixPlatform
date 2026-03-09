import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/state/AuthContext";
import { persistLastVisitedRoute } from "@/features/navigation/last-visited";

export function useLastVisitedRouteTracker() {
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!user) return;
    const route = `${location.pathname}${location.search}${location.hash}`;
    persistLastVisitedRoute(route);
  }, [user, location.pathname, location.search, location.hash]);
}

