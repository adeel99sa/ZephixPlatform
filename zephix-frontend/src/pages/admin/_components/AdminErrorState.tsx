import { AlertCircle, RefreshCw } from 'lucide-react';

interface AdminErrorStateProps {
  error: Error | string | null;
  onRetry?: () => void;
  title?: string;
  message?: string;
}

export function AdminErrorState({
  error,
  onRetry,
  title = 'Unable to load content',
  message
}: AdminErrorStateProps) {
  const errorMessage = typeof error === 'string'
    ? error
    : error?.message || message || 'An error occurred while loading this page.';

  // Check if it's a permission error
  const isPermissionError =
    errorMessage.toLowerCase().includes('permission') ||
    errorMessage.toLowerCase().includes('forbidden') ||
    errorMessage.toLowerCase().includes('403') ||
    (typeof error !== 'string' && (error as any)?.response?.status === 403);

  if (isPermissionError) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-yellow-800 mb-1">
              Insufficient Permissions
            </h3>
            <p className="text-sm text-yellow-700">
              You don't have permission to view this content. Please contact your organization administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Check if it's an auth error
  const isAuthError =
    errorMessage.toLowerCase().includes('unauthorized') ||
    errorMessage.toLowerCase().includes('401') ||
    (typeof error !== 'string' && (error as any)?.response?.status === 401);

  if (isAuthError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800 mb-1">
              Authentication Required
            </h3>
            <p className="text-sm text-red-700">
              Your session has expired. Please refresh the page or log in again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Generic error
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800 mb-1">
            {title}
          </h3>
          <p className="text-sm text-red-700 mb-3">
            {errorMessage}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-800 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}





