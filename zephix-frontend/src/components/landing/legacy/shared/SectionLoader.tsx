import React from 'react';

const SectionLoader: React.FC = () => (
  <div className="flex items-center justify-center py-20">
    <div className="relative">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
    </div>
    <div className="ml-4 text-blue-600 font-medium">Loading...</div>
  </div>
);

export default SectionLoader;
