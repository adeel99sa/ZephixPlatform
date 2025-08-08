import React from 'react';

interface VarianceIndicatorProps {
  value: number;
  threshold: number;
  label: string;
  unit?: string;
  isPositive?: boolean;
  className?: string;
}

const VarianceIndicator: React.FC<VarianceIndicatorProps> = ({
  value,
  threshold,
  label,
  unit = '',
  isPositive = true,
  className = '',
}) => {
  const getVarianceStatus = () => {
    if (isPositive) {
      if (value >= threshold) return { status: 'good', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' };
      if (value >= threshold * 0.8) return { status: 'warning', color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' };
      return { status: 'critical', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
    } else {
      if (Math.abs(value) <= threshold) return { status: 'good', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' };
      if (Math.abs(value) <= threshold * 1.2) return { status: 'warning', color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' };
      return { status: 'critical', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'critical':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'good':
        return 'On Track';
      case 'warning':
        return 'At Risk';
      case 'critical':
        return 'Critical';
      default:
        return 'Unknown';
    }
  };

  const varianceStatus = getVarianceStatus();

  return (
    <div className={`border rounded-lg p-4 ${varianceStatus.bgColor} ${varianceStatus.borderColor} ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-900">{label}</h4>
        <div className={`flex items-center space-x-1 ${varianceStatus.color}`}>
          {getStatusIcon(varianceStatus.status)}
          <span className="text-xs font-medium">{getStatusText(varianceStatus.status)}</span>
        </div>
      </div>
      
      <div className="flex items-baseline space-x-2">
        <span className={`text-2xl font-bold ${varianceStatus.color}`}>
          {value.toFixed(2)}{unit}
        </span>
        <span className="text-sm text-gray-600">
          vs {threshold.toFixed(2)}{unit} target
        </span>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
          <span>Variance</span>
          <span>{((value - threshold) / threshold * 100).toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${
              varianceStatus.status === 'good' ? 'bg-green-500' :
              varianceStatus.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{
              width: `${Math.min(Math.max((value / threshold) * 100, 0), 100)}%`
            }}
          ></div>
        </div>
      </div>

      {varianceStatus.status !== 'good' && (
        <div className="mt-3 p-2 bg-white rounded border">
          <p className="text-xs text-gray-700">
            {varianceStatus.status === 'warning' 
              ? 'This metric is approaching the threshold. Consider taking action soon.'
              : 'This metric has exceeded the threshold. Immediate action is required.'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default VarianceIndicator;
