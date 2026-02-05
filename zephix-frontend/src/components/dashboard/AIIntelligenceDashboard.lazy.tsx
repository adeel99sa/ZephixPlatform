import React, { lazy, Suspense } from 'react';
import { Skeleton } from '../ui/feedback/Skeleton';

// Lazy load the heavy AI dashboard component
const AIIntelligenceDashboard = lazy(() => 
  import('./AIIntelligenceDashboard').then(m => ({ default: m.AIIntelligenceDashboard }))
);

interface AIIntelligenceDashboardLazyProps {
  projectId?: string;
}

export function AIIntelligenceDashboardLazy({ projectId }: AIIntelligenceDashboardLazyProps) {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-8 w-1/2 mb-4" />
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <Skeleton className="h-6 w-1/3 mb-4" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    }>
      <AIIntelligenceDashboard projectId={projectId} />
    </Suspense>
  );
}
