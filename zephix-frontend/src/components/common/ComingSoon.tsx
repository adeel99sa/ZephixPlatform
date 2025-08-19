import React from 'react';
import { 
  SparklesIcon, 
  ClockIcon, 
  ArrowLeftIcon,
  BeakerIcon,
  LightBulbIcon,
  RocketLaunchIcon
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { PageHeader } from '../layout/PageHeader';

interface ComingSoonProps {
  title: string;
  subtitle?: string;
  description?: string;
  features?: string[];
  estimatedLaunch?: string;
  backTo?: string;
  backLabel?: string;
}

export const ComingSoon: React.FC<ComingSoonProps> = ({
  title,
  subtitle = "We're building something amazing",
  description = "This feature is currently under development and will be available soon. Our team is working hard to bring you the best possible experience.",
  features = [
    "Advanced AI-powered insights",
    "Real-time collaboration tools",
    "Enterprise-grade security",
    "Seamless integrations"
  ],
  estimatedLaunch = "Q1 2024",
  backTo = "/dashboard",
  backLabel = "Back to Dashboard"
}) => {
  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <Link
            to={backTo}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            {backLabel}
          </Link>
        }
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          {/* Icon */}
          <div className="mx-auto w-24 h-24 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-8">
            <SparklesIcon className="w-12 h-12 text-white" />
          </div>

          {/* Main Content */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {title}
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            {description}
          </p>

          {/* Launch Estimate */}
          <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-12">
            <ClockIcon className="w-4 h-4 mr-2" />
            Estimated Launch: {estimatedLaunch}
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {features.map((feature, index) => (
              <div key={index} className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <LightBulbIcon className="w-4 h-4 text-indigo-600" />
                  </div>
                  <span className="text-gray-900 font-medium">{feature}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Call to Action */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-8 border border-indigo-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Stay Updated
            </h3>
            <p className="text-gray-600 mb-6">
              Get notified when this feature launches and be among the first to try it out.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                <RocketLaunchIcon className="w-5 h-5 mr-2" />
                Get Early Access
              </button>
              
              <button className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                <BeakerIcon className="w-5 h-5 mr-2" />
                Join Beta Program
              </button>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-12 text-sm text-gray-500">
            <p>
              Have a specific request or need this feature sooner?{' '}
              <a href="#" className="text-indigo-600 hover:text-indigo-500 font-medium">
                Contact our team
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
