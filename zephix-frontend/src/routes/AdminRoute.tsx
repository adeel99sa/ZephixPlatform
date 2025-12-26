/**
 * ROLE MAPPING SUMMARY:
 * - Uses isAdminUser(user) helper which checks permissions.isAdmin first
 * - Redirects non-admins to /403 (not /home)
 * - Logs evaluation in development mode
 */
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/state/AuthContext";
import { isAdminUser } from "@/types/roles";

/**
 * AdminRoute - Protects admin routes and ensures user has admin role
 */
export default function AdminRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Always log the current state
  console.log('[AdminRoute] Component render:', {
    loading,
    hasUser: !!user,
    userEmail: user?.email,
    userPermissions: user?.permissions,
    path: location.pathname,
  });

  if (loading) {
    console.log('[AdminRoute] Still loading, showing loading screen');
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    console.error('[AdminRoute] ❌ No user found, redirecting to login');
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // CRITICAL: Wait for permissions to be loaded
  // Sometimes the user object exists but permissions haven't loaded yet
  if (!user.permissions) {
    console.warn('[AdminRoute] ⚠️ User exists but permissions not loaded yet, waiting...', {
      email: user.email,
      hasPermissions: !!user.permissions,
    });
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading permissions...</div>
      </div>
    );
  }

  // Check if user is admin using the unified helper
  const isAdmin = isAdminUser(user);

  // Debug logging in development - ALWAYS log, even in production for this critical check
  console.log('[AdminRoute] ⚠️ CRITICAL CHECK:', {
      path: location.pathname,
      email: user.email,
      role: user.role,
      platformRole: user.platformRole,
      permissions: user.permissions,
      permissionsIsAdmin: user.permissions?.isAdmin,
      isAdminUserResult: isAdmin,
      decision: isAdmin ? 'ALLOW ✅' : 'DENY ❌',
    });

  if (!isAdmin) {
    // Log the redirect reason - ALWAYS log this critical failure
    console.error('[AdminRoute] ❌ ACCESS DENIED - Redirecting to /403', {
      email: user.email,
      role: user.role,
      platformRole: user.platformRole,
      permissions: user.permissions,
      permissionsIsAdmin: user.permissions?.isAdmin,
      isAdminUserResult: isAdmin,
      path: location.pathname,
    });
    // Redirect to 403 page, not home
    return <Navigate to="/403" replace state={{ from: location }} />;
  }

  // Success - log that we're allowing access
  console.log('[AdminRoute] ✅ ACCESS GRANTED - Rendering admin routes');

  return <Outlet />;
}


