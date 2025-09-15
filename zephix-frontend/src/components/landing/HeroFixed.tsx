import React from 'react';
import { Link } from 'react-router-dom';

const Hero: React.FC = () => {
  return (
    <section className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center pt-20">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            The AI-Powered Platform That Sees
            <span className="text-blue-600"> What Your PM Tools Miss</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Zephix combines work management, risk intelligence, and resource optimization 
            to prevent project failures before they happen.
          </p>
          
          {/* Primary CTA - Updated */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/signup" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors text-lg">
              Start Free Trial
            </Link>
            <button className="text-gray-600 hover:text-gray-900 font-medium py-3 px-6">
              Watch 2-min Demo →
            </button>
          </div>
          
          <p className="text-sm text-gray-500 mt-4">
            Free forever for up to 5 users • No credit card required
          </p>
          
          {/* Visual showing the three pillars */}
          <div className="mt-16 grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="font-semibold text-gray-900">Work Management</h3>
              <p className="text-sm text-gray-600 mt-2">Projects, tasks, workflows</p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="text-3xl mb-3">⚠️</div>
              <h3 className="font-semibold text-gray-900">Risk Intelligence</h3>
              <p className="text-sm text-gray-600 mt-2">Identify threats early</p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="text-3xl mb-3">👥</div>
              <h3 className="font-semibold text-gray-900">Resource Optimization</h3>
              <p className="text-sm text-gray-600 mt-2">Prevent conflicts & burnout</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
