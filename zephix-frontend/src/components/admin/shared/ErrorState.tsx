import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'An error occurred while loading this content. Please try again.',
  onRetry,
  className = ''
}) => {
  return (
    <div className={`text-center py-12 ${className}`}>
      <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">{message}</p>
      
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          className="inline-flex items-center"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  );
};

