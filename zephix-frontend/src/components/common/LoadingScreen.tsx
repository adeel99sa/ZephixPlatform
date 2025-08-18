import React from 'react';

/**
 * LoadingScreen Component
 * Displays a professional loading indicator during async operations
 */
export const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center z-50">
      <div className="text-center">
        {/* Animated Logo */}
        <div className="relative w-20 h-20 mx-auto mb-4">
          <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20"></div>
          <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping animation-delay-200 opacity-20"></div>
          <div className="relative bg-white rounded-full w-20 h-20 flex items-center justify-center shadow-lg">
            <svg
              className="w-10 h-10 text-blue-500 animate-pulse"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
            </svg>
          </div>
        </div>

        {/* Loading Text */}
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Loading Zephix</h2>
        <p className="text-sm text-gray-500">Preparing your intelligent co-pilot...</p>

        {/* Progress Bar */}
        <div className="mt-4 w-48 h-1 bg-gray-200 rounded-full mx-auto overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full animate-loading-bar"></div>
        </div>
      </div>
    </div>
  );
};
