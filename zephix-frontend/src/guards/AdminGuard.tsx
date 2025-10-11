import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin } = useAuthStore();
  
  if (!isAdmin()) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return <>{children}</>;
};













