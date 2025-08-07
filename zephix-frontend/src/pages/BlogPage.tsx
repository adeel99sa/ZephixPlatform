import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, FileText } from 'lucide-react';

export const BlogPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <FileText className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Blog</h1>
          <p className="text-xl text-gray-600 mb-8">Coming Soon</p>
          <p className="text-gray-500 mb-8 max-w-2xl mx-auto">
            We're working on creating valuable content about project management, AI in the workplace, 
            and insights from our journey building Zephix.
          </p>
          <Link
            to="/"
            className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Zap className="w-5 h-5 mr-2" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};
