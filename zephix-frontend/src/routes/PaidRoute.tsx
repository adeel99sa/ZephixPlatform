import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/state/AuthContext";
import { isPaidUser } from "@/utils/roles";

/**
 * PaidRoute - Restricts access to Admin and Member only
 * Guest (Viewer) users are redirected to /workspaces
 */
export default function PaidRoute() {
  const { user, loading } = useAuth();
  const loc = useLocation();

  if (loading) {
    return <div data-testid="auth-loading">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: loc }} />;
  }

  // Check if user has paid access (Admin or Member)
  if (!isPaidUser(user)) {
    // Guest users are redirected to home (most stable landing)
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
}
