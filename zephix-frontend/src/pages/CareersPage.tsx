import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Users } from 'lucide-react';

export const CareersPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Users className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Join Us</h1>
          <p className="text-xl text-gray-600 mb-8">We're building the future of project management</p>
          <p className="text-gray-500 mb-8 max-w-2xl mx-auto">
            Zephix is an early-stage startup with big ambitions. We're looking for passionate individuals 
            who want to solve real problems in project management.
          </p>
          <div className="bg-white rounded-xl p-8 max-w-2xl mx-auto shadow-sm border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Current Openings</h2>
            <p className="text-gray-600 mb-6">
              We're not actively hiring yet, but we're always interested in connecting with talented people 
              who share our vision.
            </p>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900">Full-Stack Developer</h3>
                <p className="text-gray-600 text-sm">React, TypeScript, Node.js, AI/ML experience a plus</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900">Product Manager</h3>
                <p className="text-gray-600 text-sm">Experience with project management tools and AI products</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900">AI/ML Engineer</h3>
                <p className="text-gray-600 text-sm">Experience with document processing and NLP</p>
              </div>
            </div>
            <div className="mt-6">
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
      </div>
    </div>
  );
};
