import React from 'react';

interface HealthInfo {
  buildTag: string;
  gitHash: string;
  buildTime: string;
  environment: string;
  version: string;
}

export default function HealthPage() {
  const healthInfo: HealthInfo = {
    buildTag: import.meta.env.VITE_BUILD_TAG || 'dev',
    gitHash: import.meta.env.VITE_GIT_HASH || 'unknown',
    buildTime: import.meta.env.VITE_BUILD_TIME || new Date().toISOString(),
    environment: import.meta.env.MODE || 'development',
    version: import.meta.env.VITE_APP_VERSION || '0.1.0',
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Zephix Frontend Health
        </h1>
        
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="font-medium text-gray-700">Status:</span>
            <span className="text-green-600 font-semibold">Healthy</span>
          </div>
          
          <div className="flex justify-between">
            <span className="font-medium text-gray-700">Version:</span>
            <span className="text-gray-900">{healthInfo.version}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="font-medium text-gray-700">Build Tag:</span>
            <span className="text-gray-900">{healthInfo.buildTag}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="font-medium text-gray-700">Git Hash:</span>
            <span className="text-gray-900 font-mono text-sm">{healthInfo.gitHash}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="font-medium text-gray-700">Environment:</span>
            <span className="text-gray-900">{healthInfo.environment}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="font-medium text-gray-700">Build Time:</span>
            <span className="text-gray-900 text-sm">{new Date(healthInfo.buildTime).toLocaleString()}</span>
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-500 text-center">
            Frontend is operational and ready to serve requests
          </p>
        </div>
      </div>
    </div>
  );
}
