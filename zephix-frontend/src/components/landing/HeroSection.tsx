import React, { memo } from 'react';
import { Link } from 'react-router-dom';

export const HeroSection: React.FC = memo(() => {
  return (
    <section className="relative flex h-[80vh] items-center justify-center bg-gradient-to-br from-indigo-600 to-indigo-700 text-center text-white">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl leading-tight">
          Transform Your BRDs into <br className="hidden lg:block" />
          <span className="text-yellow-300">Actionable Project Plans</span>
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg opacity-90">
          Zephix uses advanced AI to analyze your Business Requirements Documents and generate full project blueprints — complete with milestones, risks, and resource plans.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
          <Link
            to="/dashboard"
            className="inline-block rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-3 font-semibold text-white hover:from-indigo-700 hover:to-blue-700 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.015] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            aria-label="Start building your first project"
          >
            Start Building
          </Link>
          <Link
            to="/#features"
            className="inline-block rounded-xl border border-yellow-300 px-6 py-3 font-semibold text-yellow-300 hover:bg-yellow-300 hover:text-indigo-800 transition-all duration-300 hover:scale-[1.015] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            aria-label="Learn more about features"
          >
            Learn More
          </Link>
        </div>
      </div>
    </section>
  );
});

HeroSection.displayName = 'HeroSection';
