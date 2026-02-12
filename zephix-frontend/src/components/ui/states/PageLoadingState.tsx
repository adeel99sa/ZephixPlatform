import React from 'react';
import { LoadingSpinner } from '../LoadingSpinner';

interface PageLoadingStateProps {
  message?: string;
}

/**
 * Full-page loading state — centered spinner with optional message.
 * Use for top-level page loads (project list, workspace home, etc.)
 */
export const PageLoadingState: React.FC<PageLoadingStateProps> = ({
  message = 'Loading...',
}) => (
  <div
    className="flex flex-col items-center justify-center min-h-[50vh] gap-3"
    data-testid="page-loading-state"
  >
    <LoadingSpinner size="lg" />
    <p className="text-sm text-gray-500">{message}</p>
  </div>
);
