import React from 'react';

interface SkeletonProps {
  className?: string;
  lines?: number;
  height?: string;
  width?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  lines = 1,
  height = 'h-4',
  width = 'w-full'
}) => {
  if (lines === 1) {
    return (
      <div className={`animate-pulse bg-gray-200 rounded ${height} ${width} ${className}`} />
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`animate-pulse bg-gray-200 rounded ${height} ${
            index === lines - 1 ? 'w-3/4' : 'w-full'
          }`}
        />
      ))}
    </div>
  );
};

export const CardSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <Skeleton className="h-6 w-1/3 mb-4" />
    <div className="space-y-3">
      <Skeleton height="h-4" />
      <Skeleton height="h-4" width="w-5/6" />
      <Skeleton height="h-4" width="w-4/6" />
    </div>
  </div>
);

export const TableSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
    <div className="px-6 py-4 border-b border-gray-200">
      <Skeleton className="h-6 w-1/4" />
    </div>
    <div className="divide-y divide-gray-200">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="px-6 py-4">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton height="h-4" width="w-1/4" />
              <Skeleton height="h-3" width="w-1/3" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

