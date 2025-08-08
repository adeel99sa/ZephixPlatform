import React from 'react';
import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';

interface FooterProps {
  onScrollToSection: (sectionId: string) => void;
  onContactRequest: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onScrollToSection, onContactRequest }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="md:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">ZEPHIX</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              AI-powered project management for enterprise teams.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Product</h3>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => onScrollToSection('features')}
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Features
                </button>
              </li>
              <li>
                <button
                  onClick={() => onScrollToSection('pricing')}
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Pricing
                </button>
              </li>
              <li>
                <Link
                  to="/roadmap"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Roadmap
                </Link>
              </li>
              <li>
                <Link
                  to="/docs"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Documentation
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => onScrollToSection('about')}
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  About
                </button>
              </li>
              <li>
                <button
                  onClick={onContactRequest}
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Contact
                </button>
              </li>
              <li>
                <Link
                  to="/blog"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  to="/careers"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Careers
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/privacy"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  to="/security"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Security
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">
            © {currentYear} Zephix. All rights reserved.
          </p>
          <div className="mt-4 md:mt-0">
            <div className="inline-flex items-center space-x-2 bg-gray-800 px-3 py-1 rounded-full">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-xs text-gray-400">65% Complete</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
