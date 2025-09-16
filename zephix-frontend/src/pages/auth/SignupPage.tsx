/**
 * Enterprise-Secure Signup Page
 * Implements OWASP ASVS Level 1 compliance for user registration
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Eye, EyeOff, CheckCircle2, AlertCircle, Shield, UserPlus, Lock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useSecurity } from '../../hooks/useSecurity';

export function SignupPage() {
  const navigate = useNavigate();
  const { signup, user, isAuthenticated, isLoading, error, clearError } = useAuth();
  const [securityState, securityActions] = useSecurity();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    organizationName: '',  // ADD THIS LINE
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (error) {
      clearError();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🚀 Signup form submitted with data:', formData);
    
    // Clear previous validation errors
    setValidationError(null);
    clearError();
    
    // Log security event for form submission attempt
    securityActions.logEvent('enterprise_signup_form_submission', {
      email: formData.email,
      hasFirstName: !!formData.firstName,
      hasLastName: !!formData.lastName,
      passwordLength: formData.password.length,
      timestamp: new Date().toISOString(),
    }, 'medium');
    
    // Validate required fields
    if (!formData.firstName.trim()) {
      setValidationError('First name is required');
      return;
    }
    
    if (!formData.lastName.trim()) {
      setValidationError('Last name is required');
      return;
    }
    
    if (!formData.email.trim()) {
      setValidationError('Email address is required');
      return;
    }
    
    if (!formData.password) {
      setValidationError('Password is required');
      return;
    }
    
    console.log("Password check:", { password: formData.password, confirmPassword: formData.confirmPassword, match: formData.password === formData.confirmPassword });    if (formData.password !== formData.confirmPassword) {
      setValidationError('Passwords do not match');
      securityActions.logEvent('enterprise_signup_validation_failure', {
        reason: 'password_mismatch',
        email: formData.email,
        timestamp: new Date().toISOString(),
      }, 'medium');
      return;
    }

    if (formData.password.length < 8) {
      setValidationError('Password must be at least 8 characters long');
      securityActions.logEvent('enterprise_signup_validation_failure', {
        reason: 'password_too_short',
        email: formData.email,
        passwordLength: formData.password.length,
        timestamp: new Date().toISOString(),
      }, 'medium');
      return;
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*\W)[A-Za-z\d\W]{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      setValidationError('Password must contain uppercase, lowercase, number, and special character');
      securityActions.logEvent('enterprise_signup_validation_failure', {
        reason: 'password_weak',
        email: formData.email,
        timestamp: new Date().toISOString(),
      }, 'medium');
      return;
    }

    try {
      // Log security event for registration attempt
      securityActions.logEvent('enterprise_user_registration_attempt', {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        timestamp: new Date().toISOString(),
      }, 'medium');

      const success = await signup({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        organizationName: formData.organizationName,  // ADD THIS LINE
        password: formData.password,
      });

      if (success) {
        // Log successful registration
        securityActions.logEvent('enterprise_user_registration_success', {
          email: formData.email,
          userId: user?.id,
          timestamp: new Date().toISOString(),
        }, 'low');
        
        setIsSubmitted(true);
        
        // Redirect to dashboard after successful signup
        setTimeout(() => {
          navigate('/dashboard', {
            state: {
              message: 'Enterprise account created successfully! Welcome to Zephix.',
              email: formData.email,
            },
          });
        }, 2000);
      }
    } catch (err: any) {
      // Error handling is done in the hook
      securityActions.logEvent('enterprise_user_registration_error', {
        email: formData.email,
        error: err.message || 'Unknown error',
        timestamp: new Date().toISOString(),
      }, 'high');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">ZEPHIX</span>
          </Link>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Create Enterprise Account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            sign in to your existing account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {isSubmitted ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Enterprise Account Created Successfully!
              </h3>
              <p className="text-gray-600 mb-4">
                Welcome to Zephix! Your enterprise account has been created with full security compliance.
              </p>
              <p className="text-sm text-blue-600">
                Redirecting to secure login...
              </p>
            </div>
          ) : (
            <form autoComplete="new-password" onSubmit={handleSubmit} className="space-y-6">
              {(error || validationError) && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                    <p className="text-sm text-red-800">{error || validationError}</p>
                  </div>
                </div>
              )}

              {/* Enterprise Security Status */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-md p-4">
                <div className="flex items-start">
                  <div className="p-2 bg-green-100 rounded-lg mr-3">
                    <Shield className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-800 mb-1">
                      🚀 Enterprise Security Active
                    </p>
                    <p className="text-sm text-green-700 mb-2">
                      {securityState.environmentValid 
                        ? 'All security checks passed. Your data is protected by enterprise-grade security.'
                        : 'Security validation in progress...'
                      }
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-green-600">
                      <Lock className="h-3 w-3" />
                      <span>OWASP ASVS Level 1 Compliant</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                    First Name
                  </label>
                  <div className="mt-1">
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      autoComplete="given-name"
                      required
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="First name"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                    Last Name
                  </label>
                  <div className="mt-1">
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      autoComplete="family-name"
                      required
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Last name"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Enter your enterprise email"
                  />
                </div>
              </div>

              {/* Organization Name Field - ADD THIS ENTIRE BLOCK */}
              <div>
                <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700 mb-1">
                  Organization Name
                </label>
                <input
                  type="text"
                  id="organizationName"
                  name="organizationName"
                  autoComplete="organization"
                  value={formData.organizationName}
                  onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Your company name"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm pr-10"
                    placeholder="Create a secure password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Must contain 8+ characters, uppercase, lowercase, number, and special character
                </p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <div className="mt-1 relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm pr-10"
                    placeholder="Confirm your secure password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Enterprise Security Features */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex items-start">
                  <div className="p-2 bg-blue-100 rounded-lg mr-3">
                    <Lock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-blue-800 mb-2">
                      🔒 Enterprise Security Features
                    </p>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li>• JWT Token Integrity Validation</li>
                      <li>• Real-time Security Event Logging</li>
                      <li>• Session Lifecycle Management</li>
                      <li>• XSS & Injection Prevention</li>
                      <li>• Secure Token Storage</li>
                      <li>• Activity Monitoring & Timeout</li>
                      <li>• Password Strength Validation</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading || !formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.confirmPassword}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating Enterprise Account...
                    </div>
                  ) : (
                    'Create Enterprise Account'
                  )}
                </button>
              </div>

              {/* Security Notice */}
              <div className="text-center">
                <p className="text-xs text-gray-500">
                  🔐 Your account will be created immediately with enterprise-grade security
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}