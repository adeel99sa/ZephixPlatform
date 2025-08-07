import React from 'react';
import { cn } from '../../utils';
import { LoadingSpinner } from './LoadingSpinner';

/**
 * Button component props interface
 * @interface ButtonProps
 * @extends React.ButtonHTMLAttributes<HTMLButtonElement>
 */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** The visual style variant of the button */
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'dark' | 'ghost';
  /** The size of the button */
  size?: 'sm' | 'md' | 'lg';
  /** Whether the button shows a loading state */
  loading?: boolean;
  /** Text to display when the button is in loading state */
  loadingText?: string;
  /** The content to display inside the button */
  children: React.ReactNode;
  /** Icon to display on the left side of the button */
  leftIcon?: React.ReactNode;
  /** Icon to display on the right side of the button */
  rightIcon?: React.ReactNode;
  /** Whether the button should take full width of its container */
  fullWidth?: boolean;
}

/**
 * A versatile button component with multiple variants, sizes, and states.
 * 
 * @component
 * @example
 * ```tsx
 * // Basic usage
 * <Button>Click me</Button>
 * 
 * // With variant and size
 * <Button variant="primary" size="lg">Large Primary Button</Button>
 * 
 * // With loading state
 * <Button loading loadingText="Saving...">Save</Button>
 * 
 * // With icons
 * <Button leftIcon={<PlusIcon />}>Add Item</Button>
 * ```
 * 
 * @param props - The button props
 * @param props.variant - The visual style variant (default: 'primary')
 * @param props.size - The size of the button (default: 'md')
 * @param props.loading - Whether to show loading state (default: false)
 * @param props.loadingText - Text to show during loading (optional)
 * @param props.children - The button content
 * @param props.leftIcon - Icon to display on the left
 * @param props.rightIcon - Icon to display on the right
 * @param props.fullWidth - Whether button takes full width
 * @param props.disabled - Whether button is disabled
 * @param props.className - Additional CSS classes
 * @param props.type - Button type (default: 'button')
 * 
 * @returns A styled button element with proper accessibility attributes
 */
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
    'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none';

  const variantClasses = {
    primary: 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700 shadow-md hover:shadow-lg hover:scale-[1.015] active:scale-[1.01]',
    secondary: 'bg-gray-700 text-white hover:bg-gray-600 border border-gray-600 hover:scale-[1.015] active:scale-[1.01]',
    outline: 'border border-gray-600 bg-gray-700 text-gray-200 hover:bg-gray-600 hover:text-white hover:scale-[1.015] active:scale-[1.01]',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-md hover:shadow-lg hover:scale-[1.015] active:scale-[1.01]',
    dark: 'bg-gray-800 text-white hover:bg-gray-700 border border-gray-700 hover:scale-[1.015] active:scale-[1.01]',
    ghost: 'text-gray-300 hover:text-white hover:bg-gray-700 hover:scale-[1.015] active:scale-[1.01]',
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm gap-1.5',
    md: 'px-6 py-3 text-sm gap-2',
    lg: 'px-8 py-4 text-base gap-2',
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
