/**
 * Enterprise-Secure Login Page
 * Implements OWASP ASVS Level 1 compliance for authentication
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Zap, Eye, EyeOff, CheckCircle2, AlertCircle, Shield, Lock } from 'lucide-react';
import { useEnterpriseAuth } from '../../hooks/useEnterpriseAuth';
import { useSecurity } from '../../hooks/useSecurity';
import { enterpriseErrorHandler } from '../../services/enterpriseErrorHandler';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, authState, isLoading, error, clearError } = useEnterpriseAuth();
  const [securityState, securityActions] = useSecurity();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handle messages from navigation state (e.g., from email verification)
  useEffect(() => {
    const state = location.state as any;
    if (state?.message) {
      setSuccessMessage(state.message);
      if (state.email) {
        setFormData(prev => ({ ...prev, email: state.email }));
      }
      
      // Log security event for navigation state
      securityActions.logEvent('login_navigation_state', {
        hasMessage: !!state.message,
        hasEmail: !!state.email,
        source: 'navigation_state',
      }, 'low');
    }
  }, [location.state, securityActions]);

  // Redirect if already authenticated
  useEffect(() => {
    if (authState.isAuthenticated) {
      const returnUrl = location.state?.from?.pathname || '/dashboard';
      navigate(returnUrl, { replace: true });
    }
  }, [authState.isAuthenticated, navigate, location.state]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    
    // Log security event for form submission attempt
    securityActions.logEvent('enterprise_login_form_submission', {
      email: formData.email,
      hasPassword: !!formData.password,
      timestamp: new Date().toISOString(),
    }, 'medium');

    try {
      const success = await login({
        email: formData.email,
        password: formData.password,
      });

      if (success) {
        // Log successful login
        securityActions.logEvent('enterprise_login_success', {
          email: formData.email,
          userId: authState.user?.id,
          timestamp: new Date().toISOString(),
        }, 'low');
        
        setIsSubmitted(true);
        
        // Redirect after success message
        setTimeout(() => {
          const returnUrl = location.state?.from?.pathname || '/dashboard';
          navigate(returnUrl);
          
          // Log navigation to dashboard
          securityActions.logEvent('user_navigation_dashboard', {
            email: formData.email,
            returnUrl,
            timestamp: new Date().toISOString(),
          }, 'low');
        }, 1500);
      }
    } catch (err: any) {
      // Enterprise-grade error handling - NEVER expose internal errors
      const enterpriseError = enterpriseErrorHandler.handleAuthError(err, 'LoginPage');
      
      // Log security event with sanitized error
      securityActions.logEvent('enterprise_login_error', {
        email: formData.email,
        errorCode: enterpriseError.code,
        severity: enterpriseError.severity,
        timestamp: new Date().toISOString(),
      }, enterpriseError.severity);
      
      // Set user-friendly error message (NEVER internal details)
      setError(enterpriseError.userMessage);
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
          Enterprise Secure Sign In
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <Link to="/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
            create a new enterprise account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {isSubmitted ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Enterprise Authentication Successful!
              </h3>
              <p className="text-gray-600">
                Redirecting to secure dashboard...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {successMessage && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                  <div className="flex">
                    <CheckCircle2 className="h-5 w-5 text-green-400 mr-2" />
                    <p className="text-sm text-green-800">{successMessage}</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                    <div>
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
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
                        ? 'All security checks passed. Your login is protected by enterprise-grade security.'
                        : 'Security validation in progress...'
                      }
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-green-600">
                      <Lock className="h-3 w-3" />
                      <span>Enterprise Security Standards</span>
                    </div>
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

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm pr-10"
                    placeholder="Enter your secure password"
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
              </div>

              {/* Enterprise Security Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex items-start">
                  <div className="p-2 bg-blue-100 rounded-lg mr-3">
                    <Lock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-blue-800 mb-2">
                      🔒 Enterprise Security
                    </p>
                    <p className="text-xs text-blue-700">
                      Your authentication is protected by enterprise-grade security measures. 
                      All login attempts are monitored and logged for security purposes.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading || !formData.email || !formData.password}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Enterprise Authentication...
                    </div>
                  ) : (
                    'Sign In Securely'
                  )}
                </button>
              </div>

              {/* Security Notice */}
              <div className="text-center">
                <p className="text-xs text-gray-500">
                  🔐 Your credentials are encrypted and transmitted securely over HTTPS
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};