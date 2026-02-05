import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { cn } from '../../utils';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  backTo?: string;
  className?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  showBackButton = false,
  backTo = '/dashboard',
  className = '',
  children,
  actions
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else {
      // Fallback to browser back if no specific route provided
      window.history.back();
    }
  };

  return (
    <div className={cn("mb-8", className)}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          {showBackButton && (
            <button
              onClick={handleBack}
              className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors duration-200 mt-1"
              title="Go back"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span className="text-sm font-medium">Back</span>
            </button>
          )}
          
          <div>
            <h1 className="text-2xl font-bold text-white leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-slate-400 mt-1 text-sm">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Additional content like action buttons */}
        {(children || actions) && (
          <div className="flex items-center space-x-3">
            {actions}
            {children}
          </div>
        )}
      </div>
    </div>
  );
};
