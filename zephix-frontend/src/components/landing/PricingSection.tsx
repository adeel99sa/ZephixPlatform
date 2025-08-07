import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PricingSection: React.FC = () => {
  const plans = [
    {
      name: 'Starter',
      price: '$29/mo',
      description: "For individuals and small teams starting with AI-driven PM.",
      features: [
        'Up to 2 admins/members',
        'Unlimited viewers (free)',
        'Full-featured BRD-to-Plan AI',
        'Core dashboards',
        'Email support',
        '30-day free trial'
      ],
      cta: 'Start Free Trial',
      ctaTo: '/auth/login',
      highlight: false
    },
    {
      name: 'Professional',
      price: '$79/mo',
      description: "For growing teams needing advanced AI and reporting.",
      features: [
        'Unlimited admins/members',
        'Unlimited projects',
        'Portfolio/Program dashboards',
        'Advanced risk/resource AI',
        'Priority email support',
        '30-day free trial'
      ],
      cta: 'Start Free Trial',
      ctaTo: '/auth/login',
      highlight: true
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      description: "For organizations needing SSO, integrations, custom KPIs.",
      features: [
        'Everything in Pro',
        'Custom integrations & SSO',
        'Dedicated CSM & onboarding',
        'API & SLA',
        'Volume pricing available'
      ],
      cta: 'Contact Sales',
      ctaTo: '/contact',
      highlight: false
    }
  ];

  return (
    <section id="pricing" className="container mx-auto px-4 py-20" aria-labelledby="pricing-heading">
      <h2 id="pricing-heading" className="text-center text-4xl font-bold text-gray-900 mb-5">
        Choose Your Plan
      </h2>
      <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
        All plans include AI-powered project planning and automation. Start with a 30-day free trial—upgrade any time.
      </p>
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
            <p className="mb-4 text-gray-700">{plan.description}</p>
            <ul className="mb-8 space-y-2 text-left max-w-xs mx-auto">
              {plan.features.map(feature => (
                <li key={feature} className="flex items-center text-gray-800">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500 mr-2" aria-hidden="true" />
                  {feature}
                </li>
              ))}
            </ul>
            <Link
              to={plan.ctaTo}
              className={`block w-full rounded-xl py-3 font-semibold ${
                plan.highlight
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700'
                  : 'bg-gray-100 text-indigo-700 hover:bg-gray-200'
              } transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400`}
              aria-label={plan.cta}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-gray-400 mt-8">
        Admin/member users require paid seats. Viewer accounts are free. Contact us for volume discounts and enterprise features.
      </p>
    </section>
  );
};
