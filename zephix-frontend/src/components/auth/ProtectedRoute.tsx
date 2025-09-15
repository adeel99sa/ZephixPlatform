// File: src/components/auth/ProtectedRoute.tsx
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
}

export function ProtectedRoute({ children, requiredPermission }: ProtectedRouteProps) {
  const token = useAuthStore(state => state.accessToken);
  const user = useAuthStore(state => state.user);
  const location = useLocation();

  // Check authentication immediately - Zustand persist handles hydration automatically
  const hasValidSession = !!(token && user);

  if (!hasValidSession) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}