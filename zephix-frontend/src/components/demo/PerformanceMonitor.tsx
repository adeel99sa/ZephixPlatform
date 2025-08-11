import React, { useEffect, useState } from 'react';

interface PerformanceMetrics {
  fps: number;
  loadTime: number;
  memoryUsage?: number;
}

export const PerformanceMonitor: React.FC<{ onMetrics?: (metrics: PerformanceMetrics) => void }> = ({ onMetrics }) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    loadTime: 0
  });

  useEffect(() => {
    // Measure load time
    const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
    
    // FPS monitoring
    let lastTime = performance.now();
    let frames = 0;
    let fps = 60;

    const measureFPS = () => {
      frames++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        fps = Math.round((frames * 1000) / (currentTime - lastTime));
        frames = 0;
        lastTime = currentTime;
        
        // Update metrics
        const newMetrics = {
          fps,
          loadTime: loadTime / 1000, // Convert to seconds
          memoryUsage: (performance as any).memory?.usedJSHeapSize
        };
        
        setMetrics(newMetrics);
        onMetrics?.(newMetrics);
      }
      
      requestAnimationFrame(measureFPS);
    };

    const animationId = requestAnimationFrame(measureFPS);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [onMetrics]);

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg p-3 text-xs text-slate-300 z-50">
      <div className="space-y-1">
        <div className="flex items-center justify-between space-x-4">
          <span>FPS:</span>
          <span className={metrics.fps >= 50 ? 'text-green-400' : metrics.fps >= 30 ? 'text-yellow-400' : 'text-red-400'}>
            {metrics.fps}
          </span>
        </div>
        <div className="flex items-center justify-between space-x-4">
          <span>Load:</span>
          <span className={metrics.loadTime <= 3 ? 'text-green-400' : 'text-yellow-400'}>
            {metrics.loadTime.toFixed(2)}s
          </span>
        </div>
        {metrics.memoryUsage && (
          <div className="flex items-center justify-between space-x-4">
            <span>Mem:</span>
            <span>{(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB</span>
          </div>
        )}
      </div>
    </div>
  );
};