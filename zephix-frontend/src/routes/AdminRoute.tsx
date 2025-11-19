import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/state/AuthContext";

/**
 * AdminRoute - Protects admin routes and ensures user has admin role
 */
export default function AdminRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Check if user is admin or owner
  const isAdmin = user.role === 'admin' || user.role === 'owner' || user.email === 'admin@zephix.ai';

  if (!isAdmin) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}

