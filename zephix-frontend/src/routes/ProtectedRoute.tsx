import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/state/AuthContext";

export default function ProtectedRoute({ children }: { children?: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();
  const loc = useLocation();

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="max-w-3xl mx-auto">
          <div className="h-6 w-48 bg-gray-200 rounded mb-3" />
          <div className="h-4 w-full bg-gray-200 rounded mb-2" />
          <div className="h-4 w-5/6 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-2/3 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const returnUrl = encodeURIComponent(loc.pathname + loc.search);
    return <Navigate to={`/login?reason=session_expired&returnUrl=${returnUrl}`} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
