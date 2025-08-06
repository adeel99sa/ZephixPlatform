import React, { memo } from 'react';
import { Bolt } from 'lucide-react';
import { Link } from 'react-router-dom';

export const LandingNavbar: React.FC = memo(() => {
  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-white shadow-sm">
      <nav className="container mx-auto flex h-16 items-center justify-between px-4" role="navigation" aria-label="Main navigation">
        <Link to="/" className="flex items-center space-x-2" aria-label="Zephix home">
          <Bolt className="h-6 w-6 text-indigo-600" aria-hidden="true" />
          <span className="text-xl font-bold text-gray-800">Zephix</span>
          <span className="hidden sm:inline-block text-sm bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">AI Co-pilot</span>
        </Link>
        <div className="hidden md:flex items-center space-x-6">
          <Link to="/" className="text-gray-600 hover:text-indigo-600" aria-label="Go to home page">Home</Link>
          <Link to="/#features" className="text-gray-600 hover:text-indigo-600" aria-label="View features">Features</Link>
          <Link to="/#how-it-works" className="text-gray-600 hover:text-indigo-600" aria-label="Learn how it works">How It Works</Link>
          <Link to="/#pricing" className="text-gray-600 hover:text-indigo-600" aria-label="View pricing">Pricing</Link>
        </div>
        <div className="flex items-center space-x-4">
          <Link
            to="/auth/login"
            className="text-gray-600 hover:text-indigo-600"
            aria-label="Log in to your account"
          >
            Log in
          </Link>
          <Link
            to="/dashboard"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 transition"
            aria-label="Get started with Zephix"
          >
            Get Started
          </Link>
        </div>
      </nav>
    </header>
  );
});

LandingNavbar.displayName = 'LandingNavbar';
