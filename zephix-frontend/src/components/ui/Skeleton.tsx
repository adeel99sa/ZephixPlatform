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

export function Skeleton({ className = "" }: any) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`}></div>
  );
}

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
