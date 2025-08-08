import React from 'react';

interface EarnedValueData {
  date: string;
  plannedValue: number;
  earnedValue: number;
  actualCost: number;
}

interface EarnedValueChartProps {
  data: EarnedValueData[];
  projectId: string;
  className?: string;
}

const EarnedValueChart: React.FC<EarnedValueChartProps> = ({
  data,
  projectId,
  className = '',
}) => {
  const calculateMetrics = () => {
    if (data.length === 0) return null;

    const latest = data[data.length - 1];
    const plannedValue = latest.plannedValue;
    const earnedValue = latest.earnedValue;
    const actualCost = latest.actualCost;

    const cpi = actualCost > 0 ? earnedValue / actualCost : 0;
    const spi = plannedValue > 0 ? earnedValue / plannedValue : 0;
    const cv = earnedValue - actualCost;
    const sv = earnedValue - plannedValue;

    return {
      cpi,
      spi,
      cv,
      sv,
      plannedValue,
      earnedValue,
      actualCost,
    };
  };

  const metrics = calculateMetrics();

  if (!metrics) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Earned Value Analysis</h3>
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  const getStatusColor = (value: number, isPositive: boolean) => {
    if (isPositive) {
      return value >= 1 ? 'text-green-600' : value >= 0.9 ? 'text-yellow-600' : 'text-red-600';
    } else {
      return value >= 0 ? 'text-green-600' : 'text-red-600';
    }
  };

  const getStatusText = (value: number, isPositive: boolean) => {
    if (isPositive) {
      return value >= 1 ? 'On Track' : value >= 0.9 ? 'At Risk' : 'Behind Schedule';
    } else {
      return value >= 0 ? 'Under Budget' : 'Over Budget';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Earned Value Analysis</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm font-medium text-blue-600">Cost Performance Index</div>
          <div className={`text-2xl font-bold ${getStatusColor(metrics.cpi, true)}`}>
            {metrics.cpi.toFixed(2)}
          </div>
          <div className="text-sm text-gray-600">
            {getStatusText(metrics.cpi, true)}
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm font-medium text-green-600">Schedule Performance Index</div>
          <div className={`text-2xl font-bold ${getStatusColor(metrics.spi, true)}`}>
            {metrics.spi.toFixed(2)}
          </div>
          <div className="text-sm text-gray-600">
            {getStatusText(metrics.spi, true)}
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-sm font-medium text-purple-600">Cost Variance</div>
          <div className={`text-2xl font-bold ${getStatusColor(metrics.cv, false)}`}>
            ${metrics.cv.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">
            {getStatusText(metrics.cv, false)}
          </div>
        </div>

        <div className="bg-orange-50 rounded-lg p-4">
          <div className="text-sm font-medium text-orange-600">Schedule Variance</div>
          <div className={`text-2xl font-bold ${getStatusColor(metrics.sv, false)}`}>
            ${metrics.sv.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">
            {getStatusText(metrics.sv, false)}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Planned Value (PV)</span>
          <span className="text-sm font-semibold text-gray-900">
            ${metrics.plannedValue.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Earned Value (EV)</span>
          <span className="text-sm font-semibold text-gray-900">
            ${metrics.earnedValue.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Actual Cost (AC)</span>
          <span className="text-sm font-semibold text-gray-900">
            ${metrics.actualCost.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Simple chart visualization */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progress Overview</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center">
            <div className="w-20 text-xs text-gray-600">PV</div>
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full" 
                style={{ width: `${Math.min((metrics.plannedValue / Math.max(metrics.plannedValue, metrics.earnedValue, metrics.actualCost)) * 100, 100)}%` }}
              ></div>
            </div>
            <div className="w-16 text-xs text-gray-600 text-right">
              {((metrics.plannedValue / Math.max(metrics.plannedValue, metrics.earnedValue, metrics.actualCost)) * 100).toFixed(0)}%
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-20 text-xs text-gray-600">EV</div>
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full" 
                style={{ width: `${Math.min((metrics.earnedValue / Math.max(metrics.plannedValue, metrics.earnedValue, metrics.actualCost)) * 100, 100)}%` }}
              ></div>
            </div>
            <div className="w-16 text-xs text-gray-600 text-right">
              {((metrics.earnedValue / Math.max(metrics.plannedValue, metrics.earnedValue, metrics.actualCost)) * 100).toFixed(0)}%
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-20 text-xs text-gray-600">AC</div>
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-red-500 h-2 rounded-full" 
                style={{ width: `${Math.min((metrics.actualCost / Math.max(metrics.plannedValue, metrics.earnedValue, metrics.actualCost)) * 100, 100)}%` }}
              ></div>
            </div>
            <div className="w-16 text-xs text-gray-600 text-right">
              {((metrics.actualCost / Math.max(metrics.plannedValue, metrics.earnedValue, metrics.actualCost)) * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EarnedValueChart;
