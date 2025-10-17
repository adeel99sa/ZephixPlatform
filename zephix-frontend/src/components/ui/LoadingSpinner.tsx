import React from 'react';

import { cn } from '../../utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  'data-testid'?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className,
  'data-testid': testId = 'loading-spinner'
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div
      role="status"
      aria-label="Loading"
      data-testid={testId}
      className={cn(
        'animate-spin rounded-full border-2 border-gray-600 border-t-indigo-500',
        sizeClasses[size],
        className
      )}
    />
  );
};
