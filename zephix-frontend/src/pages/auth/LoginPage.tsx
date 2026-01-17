/**
 * Enterprise-Secure Login Page
 * Implements OWASP ASVS Level 1 compliance for authentication
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Zap, Eye, EyeOff, CheckCircle2, AlertCircle, Shield, Lock } from 'lucide-react';
import { useAuth } from '../../state/AuthContext';
import { usePostLoginRedirect } from '@/hooks/usePostLoginRedirect';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user, loading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      // Always redirect to /home (HomeView will handle workspace redirect)
      navigate('/home', { replace: true });
    }
  }, [user, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(formData.email, formData.password);

      // Check onboarding status after login
      try {
        const { onboardingApi } = await import('@/services/onboardingApi');
        const status = await onboardingApi.getOnboardingStatus();

        if (!status.completed) {
          // Redirect to onboarding if not completed
          navigate('/onboarding', { replace: true });
        } else {
          // Always redirect to /home after login (HomeView will handle workspace redirect)
          navigate('/home', { replace: true });
        }
      } catch (onboardingError) {
        console.error('Failed to check onboarding:', onboardingError);
        // Fallback: Always redirect to /home
        navigate('/home', { replace: true });
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8" data-testid="login-page">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <button
            onClick={() => navigate(user ? "/home" : "/")}
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity cursor-pointer"
            data-testid="login-logo"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">ZEPHIX</span>
          </button>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900" data-testid="login-title">
          Enterprise Secure Sign In
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <Link to="/signup" className="font-medium text-indigo-600 hover:text-indigo-500" data-testid="signup-link">
            create a new enterprise account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-6" data-testid="login-form">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3" data-testid="login-error">
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
                      Your login is protected by enterprise-grade security.
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
                    data-testid="login-email"
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
                    data-testid="login-password"
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm pr-10"
                    placeholder="Enter your secure password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid="password-toggle"
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
                  data-testid="login-submit"
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
        </div>
      </div>
    </div>
  );
};
