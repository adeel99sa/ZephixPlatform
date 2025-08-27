import React from 'react';

const SectionError: React.FC<{ error: Error; retry: () => void }> = ({ error, retry }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
      <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    </div>
    <h3 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h3>
    <p className="text-gray-600 mb-4 max-w-md">
      We encountered an error loading this section. Please try refreshing the page.
    </p>
    <button
      onClick={retry}
      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      Try Again
    </button>
    {process.env.NODE_ENV === 'development' && (
      <details className="mt-4 text-left">
        <summary className="text-sm text-gray-500 cursor-pointer">Error Details</summary>
        <pre className="mt-2 text-xs text-red-600 bg-red-50 p-3 rounded overflow-auto max-w-md border border-red-200">
          {error.message}
        </pre>
      </details>
    )}
  </div>
);

export default SectionError;
