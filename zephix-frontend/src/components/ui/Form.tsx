import React from 'react';

import { cn } from '../../utils';

interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode;
  loading?: boolean;
  error?: string;
  success?: string;
  onSubmit?: (e: React.FormEvent) => void;
}

export const Form: React.FC<FormProps> = ({
  children,
  loading = false,
  error,
  success,
  onSubmit,
  className,
  ...props
}) => {
  return (
    <form
      onSubmit={onSubmit}
      className={cn('space-y-6', className)}
      noValidate
      {...props}
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

      {/* Global Success Message */}
      {success && (
        <div 
          className="p-3 bg-green-900/20 border border-green-500/50 rounded-lg text-green-400 text-sm"
          role="status"
          aria-live="polite"
        >
          {success}
        </div>
      )}

      {/* Form Content */}
      <div className={cn(loading && 'opacity-50 pointer-events-none')}>
        {children}
      </div>
    </form>
  );
};

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required = false,
  error,
  children,
  className,
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      <label className="block text-sm font-medium text-gray-200">
        {label}
        {required && <span className="text-red-400 ml-1" aria-hidden="true">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  error?: string;
}

export const FormInput: React.FC<FormInputProps> = ({
  icon,
  error,
  className,
  disabled,
  ...props
}) => {
  return (
    <div className="relative">
      {icon && (
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="h-5 w-5 text-gray-400" aria-hidden="true">
            {icon}
          </span>
        </span>
      )}
      <input
        className={cn(
          'w-full rounded-lg bg-gray-800 border border-gray-700 py-2 text-gray-100 placeholder-gray-400 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed',
          icon ? 'pl-10 pr-3' : 'px-3',
          error ? 'border-red-500 focus-visible:ring-red-500' : null,
          className
        )}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? `${props.id}-error` : undefined}
        {...props}
      />
    </div>
  );
};

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const FormTextarea: React.FC<FormTextareaProps> = ({
  error,
  className,
  disabled,
  ...props
}) => {
  return (
    <textarea
      className={cn(
        'w-full rounded-lg bg-gray-800 border border-gray-700 py-2 px-3 text-gray-100 placeholder-gray-400 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none',
        error && 'border-red-500 focus-visible:ring-red-500',
        className
      )}
      disabled={disabled}
      aria-invalid={!!error}
      aria-describedby={error ? `${props.id}-error` : undefined}
      {...props}
    />
  );
};

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  error?: string;
}

export const FormSelect: React.FC<FormSelectProps> = ({
  options,
  error,
  className,
  disabled,
  ...props
}) => {
  return (
    <select
      className={cn(
        'w-full rounded-lg bg-gray-800 border border-gray-700 py-2 px-3 text-gray-100 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed',
        error && 'border-red-500 focus-visible:ring-red-500',
        className
      )}
      disabled={disabled}
      aria-invalid={!!error}
      aria-describedby={error ? `${props.id}-error` : undefined}
      {...props}
    >
      {options.map((option) => (
        <option
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          className="bg-gray-800 text-gray-100"
        >
          {option.label}
        </option>
      ))}
    </select>
  );
};
