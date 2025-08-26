import React from 'react';
import { motion } from 'framer-motion';
import { useMetricCounter, useRangeCounter } from '../../hooks/useMetricCounter';
import { countUp, hoverLift, iconFloat } from '../../lib/animations';

interface MetricCardProps {
  icon: string;
  value: number | string;
  label: string;
  unit?: string;
  delay?: number;
  className?: string;
  isRange?: boolean;
  startRange?: number;
  endRange?: number;
}

const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  value,
  label,
  unit = '',
  delay = 0,
  className = '',
  isRange = false,
  startRange = 0,
  endRange = 0
}) => {
  // Use appropriate counter hook based on value type
  const numberCounter = useMetricCounter(
    typeof value === 'number' ? value : 0,
    0,
    2000,
    delay
  );

  const rangeCounter = useRangeCounter(
    startRange,
    endRange,
    2000,
    delay
  );

  const counter = isRange ? rangeCounter : numberCounter;
  const displayValue = isRange ? rangeCounter.displayValue : numberCounter.count;

  return (
    <motion.div
      className={`
        relative p-6 rounded-2xl bg-white/5 backdrop-blur-sm
        border border-white/10 hover:border-white/20
        transition-all duration-300 group
        ${className}
      `}
      {...countUp}
      {...hoverLift}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Background glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-zephix-purple/10 to-zephix-blue/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Icon */}
      <motion.div
        className="text-4xl mb-4 text-center"
        {...iconFloat}
      >
        {icon}
      </motion.div>

      {/* Value */}
      <div className="text-center mb-2">
        <motion.span
          ref={counter.ref}
          className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent"
        >
          {displayValue}
        </motion.span>
        {unit && (
          <span className="text-2xl font-semibold text-gray-400 ml-1">
            {unit}
          </span>
        )}
      </div>

      {/* Label */}
      <p className="text-sm text-gray-400 text-center leading-relaxed">
        {label}
      </p>

      {/* Animated underline */}
      <motion.div
        className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-gradient-to-r from-zephix-purple to-zephix-blue"
        initial={{ width: 0 }}
        whileHover={{ width: '60%' }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        style={{ transform: 'translateX(-50%)' }}
      />

      {/* Subtle particles */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute top-2 right-2 w-1 h-1 bg-zephix-purple/50 rounded-full"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-2 left-2 w-0.5 h-0.5 bg-zephix-blue/50 rounded-full"
          animate={{
            scale: [1, 2, 1],
            opacity: [0.3, 0.8, 0.3]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />
      </div>
    </motion.div>
  );
};

export default MetricCard;
