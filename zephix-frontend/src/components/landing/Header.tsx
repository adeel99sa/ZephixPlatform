import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Zap } from 'lucide-react';

interface HeaderProps {
  onDemoRequest: () => void;
  onContactRequest: () => void;
  onScrollToSection: (sectionId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onDemoRequest, 
  onContactRequest, 
  onScrollToSection 
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavClick = (sectionId: string) => {
    setIsMobileMenuOpen(false);
    onScrollToSection(sectionId);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">ZEPHIX</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => onScrollToSection('features')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => onScrollToSection('pricing')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Pricing
            </button>
            <button
              onClick={() => onScrollToSection('about')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              About
            </button>
            <button
              onClick={onContactRequest}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Contact
            </button>
          </nav>

          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <button
              onClick={onDemoRequest}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              Request Demo
            </button>
            <Link
              to="/signup"
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              Sign Up
            </Link>
            <Link
              to="/login"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Login
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-white border-t border-gray-200">
              <button
                onClick={() => handleNavClick('features')}
                className="block w-full text-left px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
              >
                Features
              </button>
              <button
                onClick={() => handleNavClick('pricing')}
                className="block w-full text-left px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
              >
                Pricing
              </button>
              <button
                onClick={() => handleNavClick('about')}
                className="block w-full text-left px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
              >
                About
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onContactRequest();
                }}
                className="block w-full text-left px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
              >
                Contact
              </button>
              <div className="pt-4 space-y-2">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onDemoRequest();
                  }}
                  className="block w-full text-left px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
                >
                  Request Demo
                </button>
                <Link
                  to="/signup"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full text-left px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
                >
                  Sign Up
                </Link>
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full text-left px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Login
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
