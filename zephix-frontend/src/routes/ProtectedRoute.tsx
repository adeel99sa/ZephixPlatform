import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/state/AuthContext";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const loc = useLocation();

  // Log route protection checks
  console.log('[ProtectedRoute] Checking access:', {
    path: loc.pathname,
    loading,
    hasUser: !!user,
    userEmail: user?.email,
  });

  if (loading) {
    console.log('[ProtectedRoute] Still loading...');
    return <div data-testid="auth-loading">Loading...</div>;
  }

  if (!user) {
    console.error('[ProtectedRoute] ❌ No user, redirecting to login');
    return <Navigate to="/login" replace state={{ from: loc }} />;
  }

  console.log('[ProtectedRoute] ✅ User authenticated, allowing access');
  return <Outlet />;
}
