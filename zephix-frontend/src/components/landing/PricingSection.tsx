import React from 'react';
import { CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PricingSection: React.FC = () => {
  const plans = [
    {
      name: 'Starter',
      price: '$29',
      features: ['Up to 5 projects', 'Basic BRD analysis', 'Email support'],
      popular: false,
    },
    {
      name: 'Professional',
      price: '$79',
      features: [
        'Unlimited projects',
        'Advanced AI analysis',
        'Risk mitigation',
        'Priority support',
      ],
      popular: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      features: ['Everything in Pro', 'Custom integrations', 'Dedicated success'],
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="container mx-auto px-4 py-16" aria-labelledby="pricing-heading">
      <h2 id="pricing-heading" className="text-center text-3xl font-bold tracking-tight text-gray-800 mb-3">
        Choose Your Plan
      </h2>
      <p className="text-center text-gray-600 mb-8 max-w-2xl mx-auto">
        Start free, upgrade as you grow.
      </p>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-xl border ${
              plan.popular
                ? 'border-indigo-600 shadow-lg'
                : 'border-gray-200'
            } px-6 py-5 text-center hover:shadow-xl hover:scale-[1.015] transition-all duration-300`}
            role="article"
            aria-labelledby={`plan-${plan.name.toLowerCase()}`}
          >
            {plan.popular && (
              <div className="mb-4 inline-block rounded-full bg-indigo-600 px-3 py-1 text-sm font-medium text-white">
                Most Popular
              </div>
            )}
            <h3 id={`plan-${plan.name.toLowerCase()}`} className="text-2xl font-bold tracking-tight mb-2">{plan.price}</h3>
            <p className="text-gray-600 mb-4">{plan.name}</p>
            <ul className="space-y-2 mb-6">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center justify-center space-x-2 text-gray-600">
                  <CheckCircle className="h-5 w-5 text-green-500" aria-hidden="true" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/dashboard"
              className={`inline-block w-full rounded-xl px-6 py-3 font-semibold transition-all duration-300 hover:scale-[1.015] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                plan.popular
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700 shadow-md hover:shadow-lg'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
              aria-label={`${plan.popular ? 'Get Started' : 'Try Free'} with ${plan.name} plan`}
            >
              {plan.popular ? 'Get Started' : 'Try Free'}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
};
