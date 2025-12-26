import React from 'react';
import type { HeatmapCell } from '@/types/resourceTimeline';
import { getCellClass, formatLoadPercentage, getCellTooltip } from '@/utils/resourceTimeline';

interface ResourceHeatmapCellProps {
  cell: HeatmapCell | null;
}

export const ResourceHeatmapCell: React.FC<ResourceHeatmapCellProps> = ({ cell }) => {
  if (!cell) {
    return (
      <td className="w-16 h-12 border border-gray-200 bg-gray-50">
        <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
          -
        </div>
      </td>
    );
  }

  const totalLoad = cell.hardLoadPercent + cell.softLoadPercent;
  const cellClass = getCellClass(cell.classification, totalLoad);
  const displayText = formatLoadPercentage(cell.hardLoadPercent, cell.softLoadPercent);
  const tooltip = getCellTooltip(
    cell.hardLoadPercent,
    cell.softLoadPercent,
    cell.capacityPercent,
    cell.classification,
    cell.justification,
  );

  return (
    <td
      className={`w-16 h-12 border border-gray-200 ${cellClass} relative group cursor-pointer transition-all hover:scale-105`}
      title={tooltip}
    >
      <div className="w-full h-full flex items-center justify-center text-xs font-medium text-gray-800">
        {displayText}
      </div>

      {/* Tooltip on hover */}
      <div className="absolute z-10 hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-pre-line pointer-events-none min-w-[200px] max-w-[300px]">
        <div className="font-semibold mb-1">Load Details</div>
        <div className="text-gray-300 space-y-0.5">
          <div>
            Status: <span className="font-semibold text-white">
              {cell.hardLoadPercent > 0 && cell.softLoadPercent > 0
                ? 'Mixed (Hard/Soft)'
                : cell.hardLoadPercent > 0
                ? 'Hard'
                : 'Soft'}
            </span>
          </div>
          <div>Hard Load: {Math.round(cell.hardLoadPercent)}%</div>
          <div>Soft Load: {Math.round(cell.softLoadPercent)}%</div>
          <div>Total Load: {Math.round(totalLoad)}%</div>
          <div>Capacity: {Math.round(cell.capacityPercent)}%</div>
          <div className="mt-1 pt-1 border-t border-gray-700">
            Classification: <span className="font-semibold">{cell.classification}</span>
          </div>
          {cell.justification && cell.justification.trim() && (
            <div className="mt-1 pt-1 border-t border-gray-700">
              <div className="font-semibold text-yellow-300">Reason:</div>
              <div className="text-gray-200 italic">{cell.justification}</div>
            </div>
          )}
        </div>
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
      </div>
    </td>
  );
};



