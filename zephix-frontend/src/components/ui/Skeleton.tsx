import React from 'react';
import { cn } from '../../utils';

interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  lines?: number;
  width?: string;
  height?: string;
  'data-testid'?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rectangular',
  size = 'md',
  className,
  lines = 1,
  width,
  height,
  'data-testid': testId = 'skeleton'
}) => {
  const sizeClasses = {
    sm: 'h-4',
    md: 'h-6',
    lg: 'h-8',
    xl: 'h-12',
  };

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const baseClasses = cn(
    'animate-pulse bg-gray-700',
    variantClasses[variant],
    sizeClasses[size],
    className
  );

  if (variant === 'text' && lines > 1) {
    return (
      <div className="space-y-2" data-testid={testId}>
        {Array.from({ length: lines }, (_, index) => (
          <div
            key={index}
            className={cn(
              baseClasses,
              index === lines - 1 ? 'w-3/4' : 'w-full'
            )}
            style={{ width: index === lines - 1 ? '75%' : width }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={baseClasses}
      style={{ width, height }}
      data-testid={testId}
      role="status"
      aria-label="Loading content"
    />
  );
};

/**
 * Skeleton components for common UI patterns
 */
export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('p-6 bg-gray-800 rounded-lg border border-gray-700', className)}>
    <div className="flex items-center space-x-4 mb-4">
      <Skeleton variant="circular" size="lg" className="w-12 h-12" />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" size="md" />
        <Skeleton variant="text" size="sm" width="60%" />
      </div>
    </div>
    <div className="space-y-2">
      <Skeleton variant="text" size="md" />
      <Skeleton variant="text" size="sm" lines={2} />
    </div>
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; columns?: number; className?: string }> = ({
  rows = 5,
  columns = 4,
  className
}) => (
  <div className={cn('space-y-2', className)}>
    {/* Header */}
    <div className="flex space-x-4 p-4 bg-gray-800 rounded-t-lg border border-gray-700">
      {Array.from({ length: columns }, (_, index) => (
        <Skeleton key={index} variant="text" size="sm" className="flex-1" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }, (_, rowIndex) => (
      <div key={rowIndex} className="flex space-x-4 p-4 bg-gray-800 border border-gray-700">
        {Array.from({ length: columns }, (_, colIndex) => (
          <Skeleton key={colIndex} variant="text" size="sm" className="flex-1" />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonList: React.FC<{ items?: number; className?: string }> = ({
  items = 3,
  className
}) => (
  <div className={cn('space-y-4', className)}>
    {Array.from({ length: items }, (_, index) => (
      <div key={index} className="flex items-center space-x-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
        <Skeleton variant="circular" size="md" className="w-10 h-10" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" size="md" />
          <Skeleton variant="text" size="sm" width="40%" />
        </div>
        <Skeleton variant="rectangular" size="sm" className="w-20 h-8" />
      </div>
    ))}
  </div>
);
