import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/state/AuthContext";
import { platformRoleFromUser } from "@/utils/roles";

export function RequireAdminInline({
  children,
}: {
  children: React.ReactElement;
}) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const isAdmin =
    platformRoleFromUser(user) === "ADMIN" ||
    (!Array.isArray(user.permissions) &&
      (user.permissions as any)?.isAdmin === true);

  if (!isAdmin) return <Navigate to="/home" replace />;
  return children;
}

