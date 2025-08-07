import React from 'react';
import { CheckCircle2 } from 'lucide-react';
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
        'Basic reporting'
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
        'Advanced templates',
        'Priority support',
        'AI-powered insights',
        'Advanced integrations',
        'Custom workflows',
        'Advanced analytics',
        'Team collaboration tools'
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
        'Advanced security (RBAC)',
        'Custom integrations',
        'Dedicated support',
        'API access',
        'SLA guarantees'
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
                {plan.features.map(feature => (
                  <li key={feature} className="flex items-center text-gray-800">
                    <CheckCircle2 className="w-4 h-4 text-indigo-500 mr-3 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
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
      </div>
    </section>
  );
};
