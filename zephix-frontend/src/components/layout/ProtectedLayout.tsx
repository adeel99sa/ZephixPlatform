import React from 'react';
import { ProtectedRoute } from '../ProtectedRoute';
import { MainLayout } from '../../layouts/MainLayout';

interface ProtectedLayoutProps {
  children: React.ReactNode;
  currentPage?: string;
  fullHeight?: boolean; // For pages that need full height like dashboard
  noPadding?: boolean; // For pages that handle their own padding
}

export const ProtectedLayout: React.FC<ProtectedLayoutProps> = ({ 
  children, 
  currentPage,
  fullHeight = false,
  noPadding = false
}) => {
  return (
    <ProtectedRoute>
      <MainLayout currentPage={currentPage}>
        {noPadding ? (
          children
        ) : (
          <div className={
            fullHeight 
              ? "h-[calc(100vh-80px)]" 
              : "container mx-auto px-4 sm:px-6 lg:px-8 py-8"
          }>
            {children}
          </div>
        )}
      </MainLayout>
    </ProtectedRoute>
  );
};
