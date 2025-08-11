import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Zap, ChevronDown, Brain, Users, BarChart3, Shield, Database, Zap as ZapIcon } from 'lucide-react';

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
  const [isFeaturesDropdownOpen, setIsFeaturesDropdownOpen] = useState(false);

  const handleNavClick = (sectionId: string) => {
    console.log('Navigation clicked:', sectionId);
    setIsMobileMenuOpen(false);
    setIsFeaturesDropdownOpen(false);
    onScrollToSection(sectionId);
  };

  const handleDemoRequest = () => {
    console.log('Header: Demo request clicked');
    onDemoRequest();
  };

  const handleContactRequest = () => {
    console.log('Header: Contact request clicked');
    onContactRequest();
  };

  const features = [
    {
      name: 'BRD to Plan',
      description: 'Convert requirements to project plans',
      icon: Brain,
      sectionId: 'brd-to-plan'
    },
    {
      name: 'Approvals & Stage Gates',
      description: 'Streamlined approval workflows',
      icon: Shield,
      sectionId: 'approvals-stage-gates'
    },
    {
      name: 'Reporting',
      description: 'Automated status reports',
      icon: BarChart3,
      sectionId: 'reporting'
    },
    {
      name: 'Timeline',
      description: 'Project scheduling & tracking',
      icon: ZapIcon,
      sectionId: 'timeline'
    },
    {
      name: 'List & Board',
      description: 'Task management views',
      icon: Users,
      sectionId: 'list-board'
    }
  ];

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
            {/* Features Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsFeaturesDropdownOpen(!isFeaturesDropdownOpen)}
                onMouseEnter={() => setIsFeaturesDropdownOpen(true)}
                className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 transition-colors hover:scale-105 transform"
              >
                <span>Features</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isFeaturesDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Features Dropdown Menu */}
              {isFeaturesDropdownOpen && (
                <div 
                  className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50"
                  onMouseLeave={() => setIsFeaturesDropdownOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900">Platform Features</h3>
                    <p className="text-xs text-gray-500">Explore our AI-powered capabilities</p>
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {features.map((feature) => {
                      const IconComponent = feature.icon;
                      return (
                        <button
                          key={feature.name}
                          onClick={() => handleNavClick(feature.sectionId)}
                          className="flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors group"
                        >
                          <div className="w-8 h-8 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                            <IconComponent className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{feature.name}</div>
                            <div className="text-xs text-gray-500">{feature.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="px-4 py-3 border-t border-gray-100">
                    <button
                      onClick={() => handleNavClick('features')}
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      View All Features →
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => handleNavClick('solutions')}
              className="text-gray-600 hover:text-gray-900 transition-colors hover:scale-105 transform"
            >
              Solutions
            </button>
            <button
              onClick={() => handleNavClick('pricing')}
              className="text-gray-600 hover:text-gray-900 transition-colors hover:scale-105 transform"
            >
              Pricing
            </button>
            <button
              onClick={() => handleNavClick('customers')}
              className="text-gray-600 hover:text-gray-900 transition-colors hover:scale-105 transform"
            >
              Customers
            </button>
            <button
              onClick={() => handleNavClick('security')}
              className="text-gray-600 hover:text-gray-900 transition-colors hover:scale-105 transform"
            >
              Security
            </button>
            <Link
              to="/roadmap"
              className="text-gray-600 hover:text-gray-900 transition-colors hover:scale-105 transform"
            >
              Roadmap
            </Link>
            <Link
              to="/docs"
              className="text-gray-600 hover:text-gray-900 transition-colors hover:scale-105 transform"
            >
              Docs
            </Link>
          </nav>

          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <button
              onClick={handleDemoRequest}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors hover:scale-105 transform"
            >
              Request Demo
            </button>
            <Link
              to="/signup"
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors hover:scale-105 transform"
            >
              Sign Up
            </Link>
            <Link
              to="/login"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors hover:scale-105 transform"
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
                  handleContactRequest();
                }}
                className="block w-full text-left px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
              >
                Contact
              </button>
              <div className="pt-4 space-y-2">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleDemoRequest();
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
