import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Zap, ChevronDown, Brain, Users, BarChart3, Shield, Database, Zap as ZapIcon, BookOpen, FileText, HelpCircle, Building2, Briefcase, Factory, Heart, GraduationCap, Sparkles } from 'lucide-react';

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
  const [isPlatformDropdownOpen, setIsPlatformDropdownOpen] = useState(false);
  const [isSolutionsDropdownOpen, setIsSolutionsDropdownOpen] = useState(false);
  const [isResourcesDropdownOpen, setIsResourcesDropdownOpen] = useState(false);

  const handleNavClick = (sectionId: string) => {
    console.log('Navigation clicked:', sectionId);
    setIsMobileMenuOpen(false);
    setIsPlatformDropdownOpen(false);
    setIsSolutionsDropdownOpen(false);
    setIsResourcesDropdownOpen(false);
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

  // Platform features - enterprise capabilities
  const platformFeatures = [
    {
      name: 'Strategic Planning',
      description: 'AI-enhanced project planning & roadmapping',
      icon: Brain,
      sectionId: 'strategic-planning'
    },
    {
      name: 'Resource Management',
      description: 'Intelligent team allocation & workload balancing',
      icon: Users,
      sectionId: 'resource-management'
    },
    {
      name: 'Timeline Optimization',
      description: 'AI-powered scheduling & dependency management',
      icon: BarChart3,
      sectionId: 'timeline-optimization'
    },
    {
      name: 'Automated Reporting',
      description: 'Real-time dashboards & smart status updates',
      icon: ZapIcon,
      sectionId: 'automated-reporting'
    },
    {
      name: 'Enterprise Security',
      description: 'SOC 2 compliance & advanced security features',
      icon: Shield,
      sectionId: 'enterprise-security'
    },
    {
      name: 'Integration Hub',
      description: 'Connect with Jira, Slack, MS Project & more',
      icon: Database,
      sectionId: 'integration-hub'
    }
  ];

  // Solutions by industry
  const solutions = [
    {
      name: 'Technology',
      description: 'Accelerate software delivery & product launches',
      icon: Building2,
      sectionId: 'tech-solution'
    },
    {
      name: 'Financial Services',
      description: 'Ensure compliance & manage complex portfolios',
      icon: Briefcase,
      sectionId: 'finance-solution'
    },
    {
      name: 'Manufacturing',
      description: 'Optimize production schedules & supply chains',
      icon: Factory,
      sectionId: 'manufacturing-solution'
    },
    {
      name: 'Healthcare',
      description: 'Manage clinical trials & healthcare initiatives',
      icon: Heart,
      sectionId: 'healthcare-solution'
    },
    {
      name: 'Education',
      description: 'Streamline curriculum development & research',
      icon: GraduationCap,
      sectionId: 'education-solution'
    }
  ];

  // Resources section
  const resources = [
    {
      name: 'How It Works',
      description: 'See our AI platform in action',
      icon: BookOpen,
      sectionId: 'how-it-works'
    },
    {
      name: 'About Zephix',
      description: 'Our mission & leadership team',
      icon: FileText,
      sectionId: 'about'
    },
    {
      name: 'Help Center',
      description: 'Documentation & support resources',
      icon: HelpCircle,
      href: '/help'
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
            {/* Platform Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsPlatformDropdownOpen(!isPlatformDropdownOpen)}
                onMouseEnter={() => setIsPlatformDropdownOpen(true)}
                className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <span>Platform</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isPlatformDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isPlatformDropdownOpen && (
                <div 
                  className="absolute top-full left-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50"
                  onMouseLeave={() => setIsPlatformDropdownOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900">Enterprise AI Platform</h3>
                    <p className="text-xs text-gray-500">Built for scale, designed for simplicity</p>
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {platformFeatures.map((feature) => {
                      const IconComponent = feature.icon;
                      return (
                        <button
                          key={feature.name}
                          onClick={() => handleNavClick(feature.sectionId)}
                          className="flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors group"
                        >
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                            <IconComponent className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{feature.name}</div>
                            <div className="text-xs text-gray-500">{feature.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Solutions Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsSolutionsDropdownOpen(!isSolutionsDropdownOpen)}
                onMouseEnter={() => setIsSolutionsDropdownOpen(true)}
                className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <span>Solutions</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isSolutionsDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isSolutionsDropdownOpen && (
                <div 
                  className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50"
                  onMouseLeave={() => setIsSolutionsDropdownOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900">Industry Solutions</h3>
                    <p className="text-xs text-gray-500">Tailored for your specific needs</p>
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {solutions.map((solution) => {
                      const IconComponent = solution.icon;
                      return (
                        <button
                          key={solution.name}
                          onClick={() => handleNavClick(solution.sectionId)}
                          className="flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors group"
                        >
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                            <IconComponent className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{solution.name}</div>
                            <div className="text-xs text-gray-500">{solution.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Pricing - Simple link */}
            <button
              onClick={() => handleNavClick('pricing')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Pricing
            </button>

            {/* Resources Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsResourcesDropdownOpen(!isResourcesDropdownOpen)}
                onMouseEnter={() => setIsResourcesDropdownOpen(true)}
                className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <span>Resources</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isResourcesDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isResourcesDropdownOpen && (
                <div 
                  className="absolute top-full left-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50"
                  onMouseLeave={() => setIsResourcesDropdownOpen(false)}
                >
                  <div className="grid grid-cols-1 gap-1">
                    {resources.map((resource) => {
                      const IconComponent = resource.icon;
                      return resource.href ? (
                        <Link
                          key={resource.name}
                          to={resource.href}
                          className="flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors group"
                        >
                          <div className="w-8 h-8 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                            <IconComponent className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{resource.name}</div>
                            <div className="text-xs text-gray-500">{resource.description}</div>
                          </div>
                        </Link>
                      ) : (
                        <button
                          key={resource.name}
                          onClick={() => handleNavClick(resource.sectionId!)}
                          className="flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors group"
                        >
                          <div className="w-8 h-8 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                            <IconComponent className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{resource.name}</div>
                            <div className="text-xs text-gray-500">{resource.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <button
              onClick={handleDemoRequest}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Sparkles className="w-4 h-4" />
              <span className="font-semibold">Experience AI Demo</span>
            </button>
            <button
              onClick={handleDemoRequest}
              className="px-5 py-2.5 text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Request Demo
            </button>
            <Link
              to="/login"
              className="text-gray-600 hover:text-gray-900 transition-colors text-sm"
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
              {/* Platform Section */}
              <div className="py-2">
                <div className="px-3 py-2 text-sm font-semibold text-gray-900">Platform</div>
                {platformFeatures.slice(0, 3).map((feature) => (
                  <button
                    key={feature.name}
                    onClick={() => handleNavClick(feature.sectionId)}
                    className="block w-full text-left px-6 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  >
                    {feature.name}
                  </button>
                ))}
              </div>

              {/* Solutions Section */}
              <div className="py-2">
                <div className="px-3 py-2 text-sm font-semibold text-gray-900">Solutions</div>
                {solutions.slice(0, 3).map((solution) => (
                  <button
                    key={solution.name}
                    onClick={() => handleNavClick(solution.sectionId)}
                    className="block w-full text-left px-6 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  >
                    {solution.name}
                  </button>
                ))}
              </div>

              {/* Other Links */}
              <button
                onClick={() => handleNavClick('pricing')}
                className="block w-full text-left px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
              >
                Pricing
              </button>
              
              {/* Resources */}
              <div className="py-2">
                <div className="px-3 py-2 text-sm font-semibold text-gray-900">Resources</div>
                {resources.map((resource) => (
                  resource.href ? (
                    <Link
                      key={resource.name}
                      to={resource.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block w-full text-left px-6 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    >
                      {resource.name}
                    </Link>
                  ) : (
                    <button
                      key={resource.name}
                      onClick={() => handleNavClick(resource.sectionId!)}
                      className="block w-full text-left px-6 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    >
                      {resource.name}
                    </button>
                  )
                ))}
              </div>

              {/* Mobile CTAs */}
              <div className="pt-4 space-y-2 px-3">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleDemoRequest();
                  }}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center space-x-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Experience AI Demo</span>
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleDemoRequest();
                  }}
                  className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50"
                >
                  Request Demo
                </button>
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full text-center py-3 text-gray-600 hover:text-gray-900"
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
