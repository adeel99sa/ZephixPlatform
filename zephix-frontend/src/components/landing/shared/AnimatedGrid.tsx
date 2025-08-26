import React from 'react';
import { motion } from 'framer-motion';
import { rotate, float, pulse } from '../../../lib/animations';

interface AnimatedGridProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  opacity?: number;
  speed?: 'slow' | 'normal' | 'fast';
  pattern?: 'dots' | 'lines' | 'hexagons';
  animated?: boolean;
}

const AnimatedGrid: React.FC<AnimatedGridProps> = ({
  className = '',
  size = 'md',
  opacity = 0.1,
  speed = 'normal',
  pattern = 'dots',
  animated = true
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const speedClasses = {
    slow: 'animate-[grid-flow_30s_linear_infinite]',
    normal: 'animate-[grid-flow_20s_linear_infinite]',
    fast: 'animate-[grid-flow_10s_linear_infinite]'
  };

  const baseClasses = `
    absolute inset-0 pointer-events-none
    ${className}
  `;

  const renderDots = () => (
    <div className={`absolute inset-0 ${sizeClasses[size]} ${speedClasses[speed]}`}>
      <svg width="100%" height="100%" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid-dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="1" fill="currentColor" fillOpacity={opacity} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-dots)" />
      </svg>
    </div>
  );

  const renderLines = () => (
    <div className={`absolute inset-0 ${sizeClasses[size]} ${speedClasses[speed]}`}>
      <svg width="100%" height="100%" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid-lines" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" strokeOpacity={opacity} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-lines)" />
      </svg>
    </div>
  );

  const renderHexagons = () => (
    <div className={`absolute inset-0 ${sizeClasses[size]} ${speedClasses[speed]}`}>
      <svg width="100%" height="100%" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid-hexagons" x="0" y="0" width="30" height="26" patternUnits="userSpaceOnUse">
            <path d="M15 0 L30 8.66 L30 26 L15 34.64 L0 26 L0 8.66 Z" fill="none" stroke="currentColor" strokeWidth="0.5" strokeOpacity={opacity} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-hexagons)" />
      </svg>
    </div>
  );

  const renderPattern = () => {
    switch (pattern) {
      case 'dots':
        return renderDots();
      case 'lines':
        return renderLines();
      case 'hexagons':
        return renderHexagons();
      default:
        return renderDots();
    }
  };

  if (!animated) {
    return (
      <div className={baseClasses}>
        {renderPattern()}
      </div>
    );
  }

  return (
    <motion.div className={baseClasses}>
      {/* Primary grid pattern */}
      <motion.div
        className="absolute inset-0"
        {...rotate}
        style={{ animationDuration: speed === 'slow' ? '30s' : speed === 'fast' ? '10s' : '20s' }}
      >
        {renderPattern()}
      </motion.div>

      {/* Secondary floating elements */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-2 h-2 bg-white rounded-full"
        style={{ opacity: opacity * 2 }}
        {...float}
      />
      <motion.div
        className="absolute top-3/4 right-1/4 w-1 h-1 bg-white rounded-full"
        style={{ opacity: opacity * 1.5, animationDelay: '1s' }}
        {...float}
      />
      <motion.div
        className="absolute bottom-1/4 left-1/2 w-1.5 h-1.5 bg-white rounded-full"
        style={{ opacity: opacity * 2.5 }}
        {...pulse}
      />

      {/* Subtle background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-zephix-purple/5 to-zephix-blue/5 opacity-30" />
    </motion.div>
  );
};

export default AnimatedGrid;
