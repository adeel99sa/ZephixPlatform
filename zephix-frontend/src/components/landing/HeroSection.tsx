import React, { memo } from 'react';
import { Link } from 'react-router-dom';

export const HeroSection: React.FC = memo(() => {
  return (
    <section className="relative flex h-[80vh] items-center justify-center bg-gradient-to-br from-indigo-600 to-indigo-700 text-center text-white">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-extrabold md:text-5xl lg:text-6xl leading-tight">
          Transform Your BRDs into <br className="hidden lg:block" />
          <span className="text-yellow-300">Actionable Project Plans</span>
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg opacity-90">
          Zephix uses advanced AI to analyze your Business Requirements Documents and generate full project blueprints — complete with milestones, risks, and resource plans.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
          <Link
            to="/dashboard"
            className="inline-block rounded-lg bg-yellow-300 px-6 py-3 font-semibold text-indigo-800 hover:bg-yellow-400 transition"
            aria-label="Start building your first project"
          >
            Start Building
          </Link>
          <Link
            to="/#features"
            className="inline-block rounded-lg border border-yellow-300 px-6 py-3 font-semibold text-yellow-300 hover:bg-yellow-300 hover:text-indigo-800 transition"
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
