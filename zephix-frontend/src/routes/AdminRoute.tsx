/**
 * ROLE MAPPING SUMMARY:
 * - Uses isAdminUser(user) helper which checks permissions.isAdmin first
 * - Redirects non-admins to /home (not /403)
 * - Logs evaluation in development mode
 */
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/state/AuthContext";
import { isAdminUser } from "@/types/roles";
import { PHASE_5_1_UAT_MODE } from "@/config/phase5_1";

/**
 * AdminRoute - Protects admin routes and ensures user has admin role
 *
 * Patch 3: During Phase 5.1 UAT, redirects /admin routes away except /admin/workspaces
 * Option 2: Allow /admin/workspaces during UAT so Admin can create workspaces
 */
export default function AdminRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Option 2: During UAT mode, allow only /admin/workspaces
  if (PHASE_5_1_UAT_MODE) {
    // Allow /admin/workspaces during UAT (Admin needs to create workspaces)
    if (location.pathname.startsWith('/admin/workspaces')) {
      // Continue to role check below
    } else {
      // Redirect all other admin routes to /home during UAT
      return <Navigate to="/home" replace />;
    }
  }

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
    // PROMPT 4: Redirect non-admins to /home (not /403)
    console.error('[AdminRoute] ❌ ACCESS DENIED - Redirecting to /home', {
      email: user.email,
      role: user.role,
      platformRole: user.platformRole,
      permissions: user.permissions,
      permissionsIsAdmin: user.permissions?.isAdmin,
      isAdminUserResult: isAdmin,
      path: location.pathname,
    });
    return <Navigate to="/home" replace state={{ from: location }} />;
  }

  // Success - log that we're allowing access
  console.log('[AdminRoute] ✅ ACCESS GRANTED - Rendering admin routes');

  return <Outlet />;
}


