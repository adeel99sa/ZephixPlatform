import React from 'react';
import { LoadingSpinner } from '../LoadingSpinner';

interface InlineLoadingStateProps {
  message?: string;
}

/**
 * Inline loading state — small centered spinner for sections within a page.
 * Use for tabs, panels, and widgets that load independently.
 */
export const InlineLoadingState: React.FC<InlineLoadingStateProps> = ({
  message,
}) => (
  <div
    className="flex items-center justify-center py-8 gap-2"
    data-testid="inline-loading-state"
  >
    <LoadingSpinner size="sm" />
    {message && <span className="text-xs text-gray-500">{message}</span>}
  </div>
);
