import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, BookOpen, Code, Settings, Users } from 'lucide-react';

export const DocsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center space-x-2 mb-4">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">ZEPHIX</span>
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Documentation</h1>
          <p className="text-gray-600 mt-2">Getting started guides and API documentation</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Getting Started */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 mb-8">
              <div className="flex items-center space-x-3 mb-6">
                <BookOpen className="w-6 h-6 text-indigo-600" />
                <h2 className="text-2xl font-bold text-gray-900">Getting Started</h2>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Start Guide</h3>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li>Create your account and choose your plan</li>
                    <li>Set up your first project with basic details</li>
                    <li>Invite team members to collaborate</li>
                    <li>Start using AI-powered features (coming soon)</li>
                  </ol>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Core Concepts</h3>
                  <div className="space-y-3">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Projects</h4>
                      <p className="text-gray-600 text-sm">Organize your work into projects with tasks, timelines, and team assignments.</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">AI Assistant</h4>
                      <p className="text-gray-600 text-sm">Get intelligent insights and automated assistance for project management tasks.</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Team Collaboration</h4>
                      <p className="text-gray-600 text-sm">Work together with real-time updates and shared project views.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* API Documentation */}
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-3 mb-6">
                <Code className="w-6 h-6 text-indigo-600" />
                <h2 className="text-2xl font-bold text-gray-900">API Documentation</h2>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-yellow-800 text-sm">
                  <strong>Note:</strong> API documentation is coming soon. The API is currently in development.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Authentication</h3>
                  <p className="text-gray-600 text-sm">API authentication will be implemented using JWT tokens.</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Endpoints</h3>
                  <p className="text-gray-600 text-sm">RESTful API endpoints for projects, users, and team management.</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Rate Limits</h3>
                  <p className="text-gray-600 text-sm">Standard rate limiting will be applied to ensure service stability.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/roadmap" className="text-indigo-600 hover:text-indigo-700 text-sm">
                    Product Roadmap
                  </Link>
                </li>
                <li>
                  <Link to="/pricing" className="text-indigo-600 hover:text-indigo-700 text-sm">
                    Pricing Plans
                  </Link>
                </li>
                <li>
                  <a href="#contact" className="text-indigo-600 hover:text-indigo-700 text-sm">
                    Contact Support
                  </a>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-3 mb-4">
                <Settings className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900">Configuration</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>User preferences</li>
                <li>Team settings</li>
                <li>Notification preferences</li>
                <li>Security settings</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-3 mb-4">
                <Users className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900">Team Management</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>Inviting team members</li>
                <li>Role assignments</li>
                <li>Permission management</li>
                <li>Team collaboration</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
