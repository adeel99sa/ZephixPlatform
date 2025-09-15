import React from 'react';
import { Link } from 'react-router-dom';

const Navigation: React.FC = () => {
  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className="fixed top-0 w-full bg-white border-b border-gray-200 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* Logo - without Beta badge */}
          <Link to="/" className="flex items-center space-x-2 cursor-pointer">
            <span className="text-2xl font-bold text-blue-600">Zephix</span>
          </Link>
          
          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <button onClick={() => scrollToSection('problem')} className="text-gray-600 hover:text-gray-900 transition-colors">
              Problem
            </button>
            <button onClick={() => scrollToSection('solutions')} className="text-gray-600 hover:text-gray-900 transition-colors">
              Solutions
            </button>
            <button onClick={() => scrollToSection('features')} className="text-gray-600 hover:text-gray-900 transition-colors">
              Features
            </button>
            <button onClick={() => scrollToSection('roadmap')} className="text-gray-600 hover:text-gray-900 transition-colors">
              Roadmap
            </button>
            <Link to="/login" className="text-gray-600 hover:text-gray-900 transition-colors">
              Sign In
            </Link>
            <Link to="/signup" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors">
              Sign Up Free
            </Link>
            <Link to="/signup" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
