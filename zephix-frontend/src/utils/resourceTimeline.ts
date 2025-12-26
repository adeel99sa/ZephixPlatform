/**
 * Resource Timeline Utilities
 * Helper functions for classification and styling
 */

import type { TimelineClassification } from '@/types/resourceTimeline';

/**
 * Get CSS class for a cell based on classification
 * Visual only - trusts classification from API
 */
export function getCellClass(
  classification: TimelineClassification,
  totalLoad?: number,
): string {
  const baseClass = `bg-availability-${classification.toLowerCase()}`;

  // Optional: Add opacity based on load intensity
  if (totalLoad !== undefined) {
    if (totalLoad < 50) {
      return `${baseClass} opacity-60`; // Light shade
    } else if (totalLoad <= 100) {
      return `${baseClass} opacity-100`; // Normal shade
    } else {
      return `${baseClass} opacity-100 ring-2 ring-red-400`; // Strong shade with ring
    }
  }

  return baseClass;
}

/**
 * Format load percentage for display
 */
export function formatLoadPercentage(hardLoad: number, softLoad: number): string {
  const total = Math.round(hardLoad + softLoad);
  if (softLoad > 0) {
    return `${Math.round(hardLoad)}H/${Math.round(softLoad)}S`;
  }
  return `${total}%`;
}

/**
 * Get tooltip content for a cell
 */
export function getCellTooltip(
  hardLoad: number,
  softLoad: number,
  capacityPercent: number,
  classification: TimelineClassification,
  justification?: string,
): string {
  const total = hardLoad + softLoad;
  const statusType = hardLoad > 0 && softLoad > 0 ? 'Mixed (Hard/Soft)' : hardLoad > 0 ? 'Hard' : 'Soft';

  let tooltip = `Status: ${statusType}\nHard Load: ${Math.round(hardLoad)}%\nSoft Load: ${Math.round(softLoad)}%\nTotal Load: ${Math.round(total)}%\nCapacity: ${Math.round(capacityPercent)}%\nClassification: ${classification}`;

  if (justification && justification.trim()) {
    tooltip += `\n\nReason: ${justification}`;
  }

  return tooltip;
}



