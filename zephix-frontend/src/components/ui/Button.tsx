import React from 'react';
import { cn } from '../../utils';
import { LoadingSpinner } from './LoadingSpinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'dark' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingText,
  disabled,
  className,
  children,
  type = 'button',
  leftIcon,
  rightIcon,
  fullWidth = false,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-900 disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none';

  const variantClasses = {
    primary: 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-lg hover:shadow-xl active:scale-95',
    secondary: 'bg-gray-700 text-white hover:bg-gray-600 border border-gray-600 active:scale-95',
    outline: 'border border-gray-600 bg-gray-700 text-gray-200 hover:bg-gray-600 hover:text-white active:scale-95',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-lg hover:shadow-xl active:scale-95',
    dark: 'bg-gray-800 text-white hover:bg-gray-700 border border-gray-700 active:scale-95',
    ghost: 'text-gray-300 hover:text-white hover:bg-gray-700 active:scale-95',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2',
  };

  const isDisabled = disabled || loading;
  const displayText = loading && loadingText ? loadingText : children;

  return (
    <button
      type={type}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className
      )}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-label={typeof children === 'string' ? children : undefined}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <>
          <LoadingSpinner size="sm" />
          {displayText}
        </>
      ) : (
        <>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
