import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  EyeIcon,
  EyeSlashIcon,
  BuildingOfficeIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { cn } from '../../utils';
import type { OrganizationSignupData } from '../../types/organization';

const organizationSignupSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters'),
  organizationSlug: z.string().optional(),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  industry: z.string().optional(),
  organizationSize: z.enum(['startup', 'small', 'medium', 'large', 'enterprise']).optional(),
});

type OrganizationSignupForm = z.infer<typeof organizationSignupSchema>;

export const OrganizationSignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<OrganizationSignupForm>({
    resolver: zodResolver(organizationSignupSchema),
    mode: 'onChange',
  });

  const organizationName = watch('organizationName');

  // Auto-generate slug from organization name
  React.useEffect(() => {
    if (organizationName) {
      const slug = organizationName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
        .substring(0, 100);
      setValue('organizationSlug', slug);
    }
  }, [organizationName, setValue]);

  const onSubmit = async (data: OrganizationSignupForm) => {
    setIsLoading(true);
    
    try {
      // Mock API call - replace with real implementation
      console.log('Organization signup data:', data);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(`Welcome to Zephix! Organization "${data.organizationName}" created successfully.`);
      navigate('/dashboard');
    } catch (error) {
      console.error('Organization signup error:', error);
      toast.error('Failed to create organization. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <SparklesIcon className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white">Zephix</h1>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Create Your Organization
            </h2>
            <p className="text-gray-400">
              Start your journey with AI-powered project management
            </p>
          </div>

          {/* Form */}
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white flex items-center">
                Your Information
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-300 mb-1">
                    First Name
                  </label>
                  <input
                    {...register('firstName')}
                    type="text"
                    className={cn(
                      "w-full px-3 py-2 border rounded-lg bg-gray-800 text-white placeholder-gray-400",
                      "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent",
                      errors.firstName ? "border-red-500" : "border-gray-600"
                    )}
                    placeholder="John"
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-red-400">{errors.firstName.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-300 mb-1">
                    Last Name
                  </label>
                  <input
                    {...register('lastName')}
                    type="text"
                    className={cn(
                      "w-full px-3 py-2 border rounded-lg bg-gray-800 text-white placeholder-gray-400",
                      "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent",
                      errors.lastName ? "border-red-500" : "border-gray-600"
                    )}
                    placeholder="Doe"
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-red-400">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                  Email Address
                </label>
                <input
                  {...register('email')}
                  type="email"
                  className={cn(
                    "w-full px-3 py-2 border rounded-lg bg-gray-800 text-white placeholder-gray-400",
                    "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent",
                    errors.email ? "border-red-500" : "border-gray-600"
                  )}
                  placeholder="john@company.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    className={cn(
                      "w-full px-3 py-2 pr-10 border rounded-lg bg-gray-800 text-white placeholder-gray-400",
                      "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent",
                      errors.password ? "border-red-500" : "border-gray-600"
                    )}
                    placeholder="Min. 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
                )}
              </div>
            </div>

            {/* Organization Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white flex items-center">
                <BuildingOfficeIcon className="w-5 h-5 mr-2" />
                Organization Details
              </h3>

              <div>
                <label htmlFor="organizationName" className="block text-sm font-medium text-gray-300 mb-1">
                  Organization Name
                </label>
                <input
                  {...register('organizationName')}
                  type="text"
                  className={cn(
                    "w-full px-3 py-2 border rounded-lg bg-gray-800 text-white placeholder-gray-400",
                    "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent",
                    errors.organizationName ? "border-red-500" : "border-gray-600"
                  )}
                  placeholder="Acme Corporation"
                />
                {errors.organizationName && (
                  <p className="mt-1 text-sm text-red-400">{errors.organizationName.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="organizationSlug" className="block text-sm font-medium text-gray-300 mb-1">
                  Organization URL
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-600 bg-gray-700 text-gray-400 text-sm">
                    zephix.app/
                  </span>
                  <input
                    {...register('organizationSlug')}
                    type="text"
                    className={cn(
                      "flex-1 px-3 py-2 border rounded-r-lg bg-gray-800 text-white placeholder-gray-400",
                      "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent",
                      "border-gray-600"
                    )}
                    placeholder="acme-corp"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="industry" className="block text-sm font-medium text-gray-300 mb-1">
                    Industry
                  </label>
                  <input
                    {...register('industry')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Technology"
                  />
                </div>

                <div>
                  <label htmlFor="organizationSize" className="block text-sm font-medium text-gray-300 mb-1">
                    Company Size
                  </label>
                  <select
                    {...register('organizationSize')}
                    className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Select size</option>
                    <option value="startup">Startup (1-10)</option>
                    <option value="small">Small (11-50)</option>
                    <option value="medium">Medium (51-200)</option>
                    <option value="large">Large (201-1000)</option>
                    <option value="enterprise">Enterprise (1000+)</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="website" className="block text-sm font-medium text-gray-300 mb-1">
                  Website (Optional)
                </label>
                <input
                  {...register('website')}
                  type="url"
                  className={cn(
                    "w-full px-3 py-2 border rounded-lg bg-gray-800 text-white placeholder-gray-400",
                    "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent",
                    errors.website ? "border-red-500" : "border-gray-600"
                  )}
                  placeholder="https://company.com"
                />
                {errors.website && (
                  <p className="mt-1 text-sm text-red-400">{errors.website.message}</p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isValid || isLoading}
              className={cn(
                "w-full py-3 px-4 rounded-lg font-medium text-white transition-all duration-200",
                "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700",
                "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                isLoading && "animate-pulse"
              )}
            >
              {isLoading ? 'Creating Organization...' : 'Create Organization'}
            </button>

            {/* Sign In Link */}
            <div className="text-center">
              <p className="text-gray-400">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors duration-200"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>

      {/* Right side - Feature highlights */}
      <div className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-center lg:bg-gradient-to-br lg:from-indigo-600 lg:to-purple-700">
        <div className="max-w-md px-8 text-center">
          <h3 className="text-2xl font-bold text-white mb-6">
            Start Managing Projects with AI
          </h3>
          <div className="space-y-6">
            <div className="text-left">
              <div className="flex items-center text-white mb-2">
                <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                <span className="font-medium">AI-Powered Insights</span>
              </div>
              <p className="text-indigo-100 text-sm ml-5">
                Get intelligent recommendations for project planning and risk management
              </p>
            </div>
            <div className="text-left">
              <div className="flex items-center text-white mb-2">
                <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                <span className="font-medium">Team Collaboration</span>
              </div>
              <p className="text-indigo-100 text-sm ml-5">
                Invite team members and manage roles with enterprise-grade security
              </p>
            </div>
            <div className="text-left">
              <div className="flex items-center text-white mb-2">
                <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                <span className="font-medium">Real-time Analytics</span>
              </div>
              <p className="text-indigo-100 text-sm ml-5">
                Track progress with comprehensive dashboards and reporting tools
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
