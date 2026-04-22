import React from 'react';

export interface CompletionBarProps {
  percent: number;
  size?: 'sm' | 'md';
}

/**
 * Horizontal progress bar + right-aligned percentage (ClickUp-style).
 * Green ≥75%, amber 25–74%, gray 0–24% (locked PR colors).
 */
export function CompletionBar({ percent, size = 'sm' }: CompletionBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const barHeight = size === 'sm' ? 'h-2' : 'h-2.5';

  const barColorClass =
    clamped >= 75 ? 'bg-[#22C55E]' : clamped >= 25 ? 'bg-[#F59E0B]' : 'bg-[#D1D5DB]';

  const textColorClass =
    clamped >= 75 ? 'text-[#16A34A]' : clamped >= 25 ? 'text-[#D97706]' : 'text-gray-400';

  return (
    <div className="flex min-w-[100px] max-w-[160px] items-center gap-2">
      <div className={`flex-1 overflow-hidden rounded-full bg-gray-100 ${barHeight}`}>
        <div
          className={`${barHeight} rounded-full transition-all duration-300 ${barColorClass}`}
          style={{ width: `${clamped}%` }}
          aria-hidden
        />
      </div>
      <span className={`w-9 shrink-0 text-right text-xs font-medium tabular-nums ${textColorClass}`}>
        {clamped}%
      </span>
    </div>
  );
}
