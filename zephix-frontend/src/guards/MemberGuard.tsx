import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export const MemberGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isMember, isAdmin } = useAuthStore();
  
  if (!isMember() && !isAdmin()) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return <>{children}</>;
};













