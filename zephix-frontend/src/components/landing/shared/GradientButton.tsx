import React from 'react';
import { motion } from 'framer-motion';
import { buttonHover, buttonPrimary } from '../../../lib/animations';
import { trackCTAClick } from '../../../lib/analytics';

interface GradientButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  ctaType?: string;
  location?: string;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

const GradientButton: React.FC<GradientButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  ctaType = 'button',
  location = 'unknown',
  className = '',
  type = 'button'
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;
    
    // Track CTA click for analytics
    trackCTAClick(ctaType, location);
    
    if (onClick) {
      onClick();
    }
  };

  const baseClasses = `
    relative inline-flex items-center justify-center
    font-semibold rounded-full transition-all duration-300
    focus:outline-none focus:ring-4 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    ${fullWidth ? 'w-full' : ''}
  `;

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  const variantClasses = {
    primary: `
      bg-gradient-to-r from-zephix-purple to-zephix-blue
      text-white shadow-lg shadow-zephix-purple/25
      hover:shadow-xl hover:shadow-zephix-purple/40
      focus:ring-zephix-purple/50
      before:absolute before:inset-0 before:rounded-full
      before:bg-gradient-to-r before:from-zephix-purple before:to-zephix-blue
      before:opacity-0 before:transition-opacity before:duration-300
      hover:before:opacity-100
    `,
    secondary: `
      bg-gradient-to-r from-gray-700 to-gray-800
      text-white shadow-lg shadow-gray-700/25
      hover:shadow-xl hover:shadow-gray-700/40
      focus:ring-gray-700/50
      before:absolute before:inset-0 before:rounded-full
      before:bg-gradient-to-r before:from-gray-700 before:to-gray-800
      before:opacity-0 before:transition-opacity before:duration-300
      hover:before:opacity-100
    `,
    outline: `
      bg-transparent border-2 border-zephix-purple
      text-zephix-purple hover:text-white
      hover:bg-gradient-to-r hover:from-zephix-purple hover:to-zephix-blue
      focus:ring-zephix-purple/50
      before:absolute before:inset-0 before:rounded-full
      before:bg-gradient-to-r before:from-zephix-purple before:to-zephix-blue
      before:opacity-0 before:transition-opacity before:duration-300
      hover:before:opacity-100
    `
  };

  const buttonClasses = `
    ${baseClasses}
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${className}
  `;

  return (
    <motion.button
      type={type}
      className={buttonClasses}
      onClick={handleClick}
      disabled={disabled || loading}
      {...(variant === 'primary' ? buttonPrimary : buttonHover)}
      whileFocus={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-zephix-purple to-zephix-blue opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-30" />
      
      {/* Content */}
      <div className="relative z-10 flex items-center justify-center">
        {loading ? (
          <div className="flex items-center space-x-2">
            <motion.div
              className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <span>Loading...</span>
          </div>
        ) : (
          children
        )}
      </div>

      {/* Shimmer effect on hover */}
      <div className="absolute inset-0 rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
          initial={{ x: '-100%' }}
          whileHover={{ x: '100%' }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        />
      </div>
    </motion.button>
  );
};

export default GradientButton;
