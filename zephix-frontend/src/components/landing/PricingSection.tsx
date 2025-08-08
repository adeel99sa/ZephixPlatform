import React, { useState } from 'react';
import { CheckCircle2, Info, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PricingSectionProps {
  onDemoRequest: () => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ onDemoRequest }) => {
  const plans = [
    {
      name: 'STARTER',
      price: 'FREE',
      description: "Perfect for small teams getting started with project management.",
      features: [
        'Up to 5 team members',
        'Basic project templates',
        'Email support',
        'Core PM features',
        'Mobile app access',
        'Basic reporting & dashboards',
        {
          text: 'Limited AI insights',
          tooltip: 'Get a taste of AI-powered project intelligence with basic insights and recommendations',
          limited: true
        }
      ],
      cta: 'Start Free',
      ctaTo: '/signup',
      highlight: false,
      isContact: false
    },
    {
      name: 'PROFESSIONAL',
      price: '$12/user/month',
      description: "For growing teams that need advanced features and integrations.",
      features: [
        'Unlimited team members',
        'Advanced project templates',
        'Priority support',
        'Full AI-powered insights & recommendations',
        'Advanced integrations & APIs',
        'Custom workflows & automation',
        'Advanced analytics & reporting dashboards',
        'Team collaboration tools & real-time updates'
      ],
      cta: 'Start Trial',
      ctaTo: '/signup',
      highlight: true
    },
    {
      name: 'ENTERPRISE',
      price: '$25/user/month',
      description: "For large organizations requiring advanced security and custom integrations.",
      features: [
        'Everything in Professional',
        'Advanced security & RBAC controls',
        'Custom integrations & white-labeling',
        'Dedicated support & account management',
        'Full API access & webhooks',
        'SLA guarantees & uptime commitments'
      ],
      cta: 'Contact Sales',
      ctaTo: '#',
      highlight: false,
      isContact: true
    }
  ];

  return (
    <section id="pricing" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            No hidden fees, no surprises. Start free and scale as you grow.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map(plan => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border bg-white px-8 py-10 text-center shadow-lg transition-all duration-300 hover:scale-105 ${
                plan.highlight ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200'
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-1 rounded-full text-xs font-bold shadow-lg">
                  Most Popular
                </span>
              )}
              
              <h3 className="text-2xl font-bold text-gray-900 mb-3">{plan.name}</h3>
              <div className="text-4xl font-extrabold mb-1 text-indigo-600">{plan.price}</div>
              <p className="mb-6 text-gray-700">{plan.description}</p>
              
              <ul className="mb-8 space-y-3 text-left">
                {plan.features.map((feature, index) => {
                  const isLimitedFeature = typeof feature === 'object' && feature.limited;
                  const featureText = typeof feature === 'string' ? feature : feature.text;
                  const tooltip = typeof feature === 'object' ? feature.tooltip : null;
                  
                  return (
                    <li key={index} className="flex items-start text-gray-800">
                      <CheckCircle2 className={`w-4 h-4 mr-3 flex-shrink-0 mt-0.5 ${
                        isLimitedFeature ? 'text-gray-400' : 'text-indigo-500'
                      }`} />
                      <div className="flex-1">
                        <span className={`text-sm ${isLimitedFeature ? 'text-gray-500' : ''}`}>
                          {featureText}
                          {isLimitedFeature && (
                            <span className="inline-flex items-center ml-1">
                              <Info className="w-3 h-3 text-gray-400 cursor-help" title={tooltip} />
                            </span>
                          )}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
              
              {plan.isContact ? (
                <button
                  onClick={onDemoRequest}
                  className="block w-full rounded-xl py-3 font-semibold bg-gray-100 text-indigo-700 hover:bg-gray-200 transition-all duration-300"
                >
                  {plan.cta}
                </button>
              ) : (
                <Link
                  to={plan.ctaTo}
                  className={`block w-full rounded-xl py-3 font-semibold ${
                    plan.highlight
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
                      : 'bg-gray-100 text-indigo-700 hover:bg-gray-200'
                  } transition-all duration-300`}
                >
                  {plan.cta}
                </Link>
              )}
            </div>
          ))}
        </div>
        
        {/* Feature Comparison Link */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center space-x-2 text-gray-600 hover:text-indigo-600 transition-colors cursor-pointer">
            <ExternalLink className="w-4 h-4" />
            <span className="text-sm font-medium">See full feature comparison</span>
          </div>
        </div>
      </div>
    </section>
  );
};
