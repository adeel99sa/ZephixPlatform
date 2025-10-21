import React from 'react';

type Cell = { week: string; pct: number };
export default function ResourceHeatmap({ data }: { data: Cell[] }) {
  // simple accessible heatmap using inline blocks
  return (
    <div aria-label="Utilization heatmap" className="grid grid-cols-8 gap-1">
      {data.map(({ week, pct }) => (
        <div key={week} title={`${week}: ${pct}%`} aria-label={`${week} ${pct}%`}
          className="h-4 rounded"
          style={{ backgroundColor: `rgba(59,130,246,${Math.min(1, pct/100)})` }} />
      ))}
    </div>
  );
}
