import React from 'react';

interface HealthScoreGaugeProps {
  score: number; // 0-100
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  className?: string;
}

const HealthScoreGauge: React.FC<HealthScoreGaugeProps> = ({
  score,
  label = 'Health Score',
  size = 'md',
  showValue = true,
  className = '',
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'w-24 h-24',
          circle: 'w-20 h-20',
          text: 'text-lg',
          label: 'text-xs',
        };
      case 'lg':
        return {
          container: 'w-48 h-48',
          circle: 'w-40 h-40',
          text: 'text-3xl',
          label: 'text-base',
        };
      default:
        return {
          container: 'w-32 h-32',
          circle: 'w-28 h-28',
          text: 'text-xl',
          label: 'text-sm',
        };
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreStatus = (score: number) => {
    if (score >= 80) return { status: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-50' };
    if (score >= 60) return { status: 'Good', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
    if (score >= 40) return { status: 'Fair', color: 'text-orange-600', bgColor: 'bg-orange-50' };
    return { status: 'Poor', color: 'text-red-600', bgColor: 'bg-red-50' };
  };

  const getStrokeColor = (score: number) => {
    if (score >= 80) return '#10B981'; // green-500
    if (score >= 60) return '#F59E0B'; // yellow-500
    if (score >= 40) return '#F97316'; // orange-500
    return '#EF4444'; // red-500
  };

  const sizeClasses = getSizeClasses();
  const scoreStatus = getScoreStatus(score);
  const strokeColor = getStrokeColor(score);
  
  // Calculate the circle parameters
  const radius = 36; // SVG circle radius
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className={`relative ${sizeClasses.container}`}>
        {/* Background circle */}
        <svg className={`${sizeClasses.circle} transform -rotate-90`} viewBox="0 0 80 80">
          <circle
            cx="40"
            cy="40"
            r={radius}
            stroke="#E5E7EB"
            strokeWidth="4"
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx="40"
            cy="40"
            r={radius}
            stroke={strokeColor}
            strokeWidth="4"
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 0.5s ease-in-out',
            }}
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {showValue && (
            <div className={`font-bold ${getScoreColor(score)} ${sizeClasses.text}`}>
              {score}%
            </div>
          )}
          <div className={`font-medium ${scoreStatus.color} ${sizeClasses.label}`}>
            {scoreStatus.status}
          </div>
        </div>
      </div>
      
      {label && (
        <div className={`mt-2 text-center ${sizeClasses.label} text-gray-600`}>
          {label}
        </div>
      )}
      
      {/* Status indicator */}
      <div className={`mt-2 px-2 py-1 rounded-full ${scoreStatus.bgColor} ${scoreStatus.color} ${sizeClasses.label} font-medium`}>
        {scoreStatus.status}
      </div>
    </div>
  );
};

export default HealthScoreGauge;
