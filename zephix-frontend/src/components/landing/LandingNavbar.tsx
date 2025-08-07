import React from 'react';
import { Link } from 'react-router-dom';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

export const LandingNavbar: React.FC = () => {
  return (
    <nav className="bg-white shadow-sm border-b border-gray-200" role="navigation" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2" aria-label="Go to homepage">
            <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <ChatBubbleLeftRightIcon className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-800">Zephix</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              to="/#features"
              className="text-gray-600 hover:text-indigo-600 font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              aria-label="View features"
            >
              Features
            </Link>
            <Link
              to="/#pricing"
              className="text-gray-600 hover:text-indigo-600 font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              aria-label="View pricing"
            >
              Pricing
            </Link>
            <Link
              to="/#how-it-works"
              className="text-gray-600 hover:text-indigo-600 font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              aria-label="Learn how it works"
            >
              How It Works
            </Link>
          </div>

          {/* CTA Button */}
          <div className="flex items-center space-x-4">
            <Link
              to="/auth/login"
              className="text-gray-600 hover:text-indigo-600 font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              aria-label="Log in to your account"
            >
              Log in
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.015] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              aria-label="Start building your first project"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};
