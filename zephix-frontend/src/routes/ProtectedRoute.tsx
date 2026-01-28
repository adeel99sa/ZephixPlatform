import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/state/AuthContext";

export default function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const loc = useLocation();

  if (isLoading) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ height: 12, width: 220, background: "#eee", borderRadius: 8, marginBottom: 12 }} />
        <div style={{ height: 12, width: 320, background: "#eee", borderRadius: 8, marginBottom: 12 }} />
        <div style={{ height: 12, width: 280, background: "#eee", borderRadius: 8 }} />
      </div>
    );
  }

  if (!user) {
    const returnUrl = encodeURIComponent(loc.pathname + loc.search);
    return <Navigate to={`/login?reason=session_expired&returnUrl=${returnUrl}`} replace />;
  }

  return <Outlet />;
}
