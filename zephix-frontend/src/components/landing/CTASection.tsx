import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Building, Users, Monitor, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { trackFormStart, trackFormSubmit, trackFormInteraction } from '../../lib/analytics';
import { LANDING_CONTENT } from '../../lib/constants';
import GlassCard from './shared/GlassCard';
import GradientButton from './shared/GradientButton';

// Form validation schema
const formSchema = z.object({
  email: z.string()
    .email('Please enter a valid email address')
    .refine(email => !email.includes('+'), 'Please use your primary work email (no aliases)')
    .refine(email => {
      const freeEmails = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com'];
      return !freeEmails.some(domain => email.endsWith(domain));
    }, 'Please use your work email address'),
  company: z.string()
    .min(2, 'Company name must be at least 2 characters')
    .max(100, 'Company name must be less than 100 characters'),
  teamSize: z.enum(['1-10', '11-50', '51-200', '200+']),
  currentTool: z.enum(['Monday', 'Asana', 'ClickUp', 'Jira', 'Other', 'None'])
});

type FormData = z.infer<typeof formSchema>;

// Rate limiting utility
const RATE_LIMIT_KEY = 'zephix_waitlist_submissions';
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

const isRateLimited = (): boolean => {
  try {
    const submissions = JSON.parse(localStorage.getItem(RATE_LIMIT_KEY) || '[]');
    const now = Date.now();
    const recentSubmissions = submissions.filter((timestamp: number) => now - timestamp < RATE_LIMIT_WINDOW);
    
    if (recentSubmissions.length >= RATE_LIMIT_MAX) {
      return true;
    }
    
    // Update submissions
    recentSubmissions.push(now);
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(recentSubmissions));
    return false;
  } catch {
    return false;
  }
};

// Form submission function
const submitFormData = async (data: FormData): Promise<{ success: boolean; message: string }> => {
  // Check rate limiting
  if (isRateLimited()) {
    return {
      success: false,
      message: 'Too many submission attempts. Please try again in an hour.'
    };
  }

  try {
    // Simulate API call - replace with actual endpoint
    const response = await fetch('/api/waitlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...data,
        submittedAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
        source: 'landing_page'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, message: 'Thank you! We\'ll be in touch soon.' };
  } catch (error) {
    console.error('Form submission error:', error);
    return {
      success: false,
      message: 'Something went wrong. Please try again or contact us directly.'
    };
  }
};

const CTASection: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorDetails, setErrorDetails] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    reset
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: 'onChange'
  });

  const watchedEmail = watch('email');

  // Track form interactions
  useEffect(() => {
    if (watchedEmail) {
      trackFormInteraction('email_focus');
    }
  }, [watchedEmail]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorDetails('');

    try {
      trackFormSubmit(data);
      const result = await submitFormData(data);
      
      if (result.success) {
        setSubmitStatus('success');
        reset();
        // Track successful submission
        trackFormSubmit({ ...data, status: 'success' });
      } else {
        setSubmitStatus('error');
        setErrorDetails(result.message);
        // Track failed submission
        trackFormSubmit({ ...data, status: 'error', error: result.message });
      }
    } catch (error) {
      setSubmitStatus('error');
      setErrorDetails('An unexpected error occurred. Please try again.');
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormStart = () => {
    trackFormStart();
  };

  return (
    <section className="relative py-20 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-zephix-dark via-zephix-purple/20 to-zephix-blue/20" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(107,70,193,0.1),transparent_50%)]" />
      
      {/* Floating Icons */}
      <div className="absolute top-20 left-10 text-zephix-purple/20 animate-float">
        <Mail className="w-16 h-16" />
      </div>
      <div className="absolute bottom-20 right-10 text-zephix-blue/20 animate-float-delayed">
        <Building className="w-12 h-12" />
      </div>
      <div className="absolute top-1/2 left-1/4 text-zephix-purple/30 animate-float-slow">
        <Users className="w-8 h-8" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {LANDING_CONTENT.cta.title}
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            {LANDING_CONTENT.cta.subtitle}
          </p>
        </motion.div>

        {/* Form Container */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <GlassCard
            className="p-8 md:p-12"
            hoverEffect
            border="border-zephix-purple/20"
            shadow="shadow-2xl shadow-zephix-purple/10"
          >
            {/* Success Message */}
            <AnimatePresence>
              {submitStatus === 'success' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="text-center mb-8"
                >
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    You're on the list! 🎉
                  </h3>
                  <p className="text-gray-300">
                    We'll notify you as soon as Zephix launches. Get ready to prevent project disasters!
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Message */}
            <AnimatePresence>
              {submitStatus === 'error' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="text-center mb-8"
                >
                  <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    Something went wrong
                  </h3>
                  <p className="text-gray-300">
                    {errorDetails}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            {submitStatus !== 'success' && (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                    Work Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      {...register('email')}
                      type="email"
                      id="email"
                      onFocus={handleFormStart}
                      className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-zephix-purple/50 focus:border-zephix-purple/300 transition-all duration-200"
                      placeholder="you@company.com"
                    />
                  </div>
                  {errors.email && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 text-sm text-red-400 flex items-center"
                    >
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.email.message}
                    </motion.p>
                  )}
                </div>

                {/* Company Field */}
                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-300 mb-2">
                    Company Name *
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      {...register('company')}
                      type="text"
                      id="company"
                      className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-zephix-purple/50 focus:border-zephix-purple/300 transition-all duration-200"
                      placeholder="Your Company Inc."
                    />
                  </div>
                  {errors.company && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 text-sm text-red-400 flex items-center"
                    >
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.company.message}
                    </motion.p>
                  )}
                </div>

                {/* Team Size Field */}
                <div>
                  <label htmlFor="teamSize" className="block text-sm font-medium text-gray-300 mb-2">
                    Team Size *
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      {...register('teamSize')}
                      id="teamSize"
                      className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zephix-purple/50 focus:border-zephix-purple/300 transition-all duration-200 appearance-none"
                    >
                      <option value="">Select team size</option>
                      {LANDING_CONTENT.cta.teamSizes.map((size) => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  {errors.teamSize && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 text-sm text-red-400 flex items-center"
                    >
                      <AlertCircle className="w-4 h-4 mr-1" />
                      Please select your team size
                    </motion.p>
                  )}
                </div>

                {/* Current Tool Field */}
                <div>
                  <label htmlFor="currentTool" className="block text-sm font-medium text-gray-300 mb-2">
                    Current Project Management Tool
                  </label>
                  <div className="relative">
                    <Monitor className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      {...register('currentTool')}
                      id="currentTool"
                      className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zephix-purple/50 focus:border-zephix-purple/300 transition-all duration-200 appearance-none"
                    >
                      <option value="">Select current tool</option>
                      {LANDING_CONTENT.cta.currentTools.map((tool) => (
                        <option key={tool} value={tool}>{tool}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  {errors.currentTool && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 text-sm text-red-400 flex items-center"
                    >
                      <AlertCircle className="w-4 h-4 mr-1" />
                      Please select your current tool
                    </motion.p>
                  )}
                </div>

                {/* Submit Button */}
                <GradientButton
                  type="submit"
                  disabled={!isValid || isSubmitting}
                  loading={isSubmitting}
                  fullWidth
                  className="mt-8"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Joining Waitlist...
                    </>
                  ) : (
                    LANDING_CONTENT.cta.buttonText
                  )}
                </GradientButton>

                {/* Privacy Notice */}
                <p className="text-xs text-gray-500 text-center">
                  By submitting this form, you agree to receive updates about Zephix. 
                  We respect your privacy and will never share your information.
                </p>
              </form>
            )}
          </GlassCard>
        </motion.div>

        {/* Additional CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-12"
        >
          <p className="text-gray-400 mb-4">
            {LANDING_CONTENT.cta.additionalText}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <GradientButton
              variant="outline"
              onClick={() => window.open('mailto:hello@zephix.ai', '_blank')}
            >
              Contact Sales Team
            </GradientButton>
            <GradientButton
              variant="outline"
              onClick={() => window.open('https://calendly.com/zephix-demo', '_blank')}
            >
              Schedule Demo
            </GradientButton>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
