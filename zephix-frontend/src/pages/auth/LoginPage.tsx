import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { LoginForm } from '../../components/forms/LoginForm';
import { useAuthStore } from '../../stores/authStore';
import { authApi } from '../../services/api';
import { ChatBubbleLeftRightIcon, SparklesIcon } from '@heroicons/react/24/outline';
import type { LoginCredentials } from '../../types';

export const LoginPage: React.FC = () => {
  const { isAuthenticated, setAuth, setLoading, isLoading } = useAuthStore();
  const navigate = useNavigate();

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (credentials: LoginCredentials) => {
    try {
      setLoading(true);
      const response = await authApi.login(credentials);
      setAuth(response.user, response.token);
      toast.success(`Welcome to Zephix AI, ${response.user.firstName}!`);
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Login failed:', error);
      // Error handling is done in the API interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <ChatBubbleLeftRightIcon className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Zephix AI
          </h2>
          <p className="text-gray-600 mb-6">
            Your AI-powered project management assistant
          </p>
          
          {/* Features */}
          <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 mb-6">
            <div className="flex items-center justify-center space-x-2 mb-3">
              <SparklesIcon className="w-5 h-5 text-indigo-600" />
              <span className="text-sm font-medium text-gray-700">AI-Powered Features</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Smart Project Management</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>AI Assistant</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Real-time Analytics</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span>Team Collaboration</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sign in to your account</h3>
            <p className="text-sm text-gray-500">
              Access your AI-powered project dashboard
            </p>
          </div>
          
          <LoginForm onSubmit={handleLogin} loading={isLoading} />
          
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              By signing in, you agree to our terms of service and privacy policy
            </p>
          </div>
        </div>
        
        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            New to Zephix?{' '}
            <button className="text-indigo-600 hover:text-indigo-500 font-medium">
              Contact your administrator
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}; 