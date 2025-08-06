import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/Button';
import { EnvelopeIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import type { LoginCredentials } from '../../types';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormProps = {
  onSubmit: (data: LoginCredentials) => Promise<void>;
  loading?: boolean;
  error?: string;
};

export const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, loading, error }) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid, isDirty },
    watch,
  } = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
  });

  const watchedFields = watch();
  const isFormValid = isValid && isDirty;
  const isSubmittingOrLoading = isSubmitting || loading;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
      aria-label="Login form"
      autoComplete="on"
      noValidate
    >
      {/* Global Error Message */}
      {error && (
        <div 
          className="p-3 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400 text-sm"
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}

      {/* Email Field */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-2">
          Email address
          <span className="text-red-400 ml-1" aria-hidden="true">*</span>
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <EnvelopeIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </span>
          <input
            {...register('email')}
            id="email"
            type="email"
            autoComplete="email"
            className={`w-full rounded-lg bg-gray-800 border border-gray-700 py-2 pl-10 pr-3 text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition disabled:opacity-50 disabled:cursor-not-allowed ${
              errors.email ? 'border-red-500 focus:ring-red-500' : ''
            }`}
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
            disabled={isSubmittingOrLoading}
            required
          />
        </div>
        {errors.email && (
          <p id="email-error" className="mt-1 text-xs text-red-400" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Password Field */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-2">
          Password
          <span className="text-red-400 ml-1" aria-hidden="true">*</span>
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <LockClosedIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </span>
          <input
            {...register('password')}
            id="password"
            type="password"
            autoComplete="current-password"
            className={`w-full rounded-lg bg-gray-800 border border-gray-700 py-2 pl-10 pr-3 text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition disabled:opacity-50 disabled:cursor-not-allowed ${
              errors.password ? 'border-red-500 focus:ring-red-500' : ''
            }`}
            placeholder="Enter your password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'password-error' : undefined}
            disabled={isSubmittingOrLoading}
            required
          />
        </div>
        {errors.password && (
          <p id="password-error" className="mt-1 text-xs text-red-400" role="alert">
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Submit Button */}
      <div>
        <Button
          type="submit"
          className="w-full"
          loading={isSubmittingOrLoading}
          loadingText="Signing in..."
          disabled={!isFormValid || isSubmittingOrLoading}
          aria-describedby={!isFormValid && isDirty ? 'form-error' : undefined}
        >
          Sign In
        </Button>
        {!isFormValid && isDirty && (
          <p id="form-error" className="mt-2 text-xs text-gray-400 text-center" role="alert">
            Please fill in all required fields correctly
          </p>
        )}
      </div>
    </form>
  );
};
