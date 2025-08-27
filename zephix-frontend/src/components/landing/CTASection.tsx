import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { LANDING_CONTENT } from '../../lib/constants';
import { waitlistApi } from '../../api/waitlist';

// Form validation schema
const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string()
    .email('Please enter a valid email address')
    .refine(email => !email.includes('+'), 'Please use your primary work email (no aliases)')
    .refine(email => {
      const freeEmails = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com'];
      return !freeEmails.some(domain => email.endsWith(domain));
    }, 'Please use your work email address'),
  biggestProblem: z.string().optional()
});

type FormData = z.infer<typeof formSchema>;

const CTASection: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorDetails, setErrorDetails] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: 'onChange'
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorDetails('');

    try {
      const result = await waitlistApi.join({
        name: data.name,
        email: data.email,
        biggestChallenge: data.biggestProblem
      });
      
      setSubmitStatus('success');
      setSuccessMessage(`You're #${result.position} on the list!`);
      reset();
    } catch (error: any) {
      setSubmitStatus('error');
      setErrorDetails(error.message || 'Something went wrong. Please try again or contact us directly.');
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="waitlist" className="py-20 bg-white">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {LANDING_CONTENT.cta.title}
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {LANDING_CONTENT.cta.subtitle}
          </p>
        </div>

        {/* Benefits List */}
        <div className="bg-gray-50 p-6 rounded-lg mb-8 border border-gray-200">
          <ul className="space-y-3">
            <li className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              <span className="text-gray-700">
                Be among the first 50 users to access the Q1 2026 beta
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              <span className="text-gray-700">
                Directly influence what features we build
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              <span className="text-gray-700">
                Get lifetime founding member pricing (50% off)
              </span>
            </li>
          </ul>
        </div>

        {/* Form Container */}
        <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm">
          {/* Success Message */}
          {submitStatus === 'success' && (
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to the founding team! 🎉
          </h3>
          <p className="text-gray-600">
            {successMessage || "We'll notify you as soon as Zephix launches. Get ready to prevent project disasters!"}
          </p>
            </div>
          )}

          {/* Error Message */}
          {submitStatus === 'error' && (
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Something went wrong
              </h3>
              <p className="text-gray-600">
                {errorDetails}
              </p>
            </div>
          )}

          {/* Form */}
          {submitStatus !== 'success' && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Name Field */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name *
                </label>
                <input
                  {...register('name')}
                  type="text"
                  id="name"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Your name"
                />
                {errors.name && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Work Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    {...register('email')}
                    type="email"
                    id="email"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="you@company.com"
                  />
                </div>
                {errors.email && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Biggest Problem Field */}
              <div>
                <label htmlFor="biggestProblem" className="block text-sm font-medium text-gray-700 mb-2">
                  What's your biggest project management challenge? (optional but helps us build better)
                </label>
                <textarea
                  {...register('biggestProblem')}
                  id="biggestProblem"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors h-24 resize-none"
                  placeholder="Describe the challenge you face..."
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!isValid || isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin inline" />
                    Joining Waitlist...
                  </>
                ) : (
                  LANDING_CONTENT.cta.formTitle
                )}
              </button>

              {/* Privacy Notice */}
              <p className="text-xs text-gray-500 text-center">
                No spam. No payment required. Just early access when we launch.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

export default CTASection;
