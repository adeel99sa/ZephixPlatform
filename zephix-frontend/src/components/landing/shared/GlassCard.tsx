import React from 'react';
import { motion } from 'framer-motion';
import { glassEffect, hoverLift, cardReveal } from '../../../lib/animations';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  tiltEffect?: boolean;
  padding?: 'sm' | 'md' | 'lg';
  border?: boolean;
  shadow?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  hoverEffect = true,
  tiltEffect = false,
  padding = 'md',
  border = true,
  shadow = true,
  onClick,
  disabled = false
}) => {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  const baseClasses = `
    relative overflow-hidden rounded-2xl
    backdrop-blur-xl backdrop-filter
    transition-all duration-300 ease-out
    ${paddingClasses[padding]}
    ${border ? 'border border-white/10' : ''}
    ${shadow ? 'shadow-2xl' : ''}
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    ${onClick && !disabled ? 'cursor-pointer' : ''}
  `;

  const glassClasses = `
    bg-white/5
    hover:bg-white/10
    before:absolute before:inset-0
    before:bg-gradient-to-br before:from-white/10 before:to-white/5
    before:opacity-0 before:transition-opacity before:duration-300
    hover:before:opacity-100
  `;

  const cardClasses = `
    ${baseClasses}
    ${glassClasses}
    ${className}
  `;

  const animationProps = {
    ...cardReveal,
    ...(hoverEffect && hoverLift),
    ...(tiltEffect && {
      whileHover: {
        rotateX: 5,
        rotateY: 5,
        transition: { duration: 0.3, ease: "easeInOut" }
      }
    })
  };

  const handleClick = () => {
    if (onClick && !disabled) {
      onClick();
    }
  };

  return (
    <motion.div
      className={cardClasses}
      onClick={handleClick}
      {...(animationProps as object)}
      whileFocus={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-zephix-purple/5 to-zephix-blue/5 opacity-0 hover:opacity-100 transition-opacity duration-300" />
      
      {/* Subtle inner glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl" />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Hover border effect */}
      {border && (
        <div className="absolute inset-0 rounded-2xl border border-transparent bg-gradient-to-r from-zephix-purple/50 to-zephix-blue/50 opacity-0 hover:opacity-100 transition-opacity duration-300" />
      )}

      {/* Shimmer effect on hover */}
      {hoverEffect && (
        <div className="absolute inset-0 rounded-2xl overflow-hidden">
          <motion.div
            className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent"
            initial={{ x: '-100%' }}
            whileHover={{ x: '100%' }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          />
        </div>
      )}
    </motion.div>
  );
};

export default GlassCard;
