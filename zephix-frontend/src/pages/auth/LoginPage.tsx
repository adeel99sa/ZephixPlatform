import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LoginForm } from '../../components/forms/LoginForm';
import { useAuthStore } from '../../stores/authStore';
import { ChatBubbleLeftRightIcon, SparklesIcon } from '@heroicons/react/24/outline';
import type { LoginCredentials } from '../../types';

interface LoginPageProps {
  // Add props here if needed in the future
}

export const LoginPage: React.FC<LoginPageProps> = () => {
  const { isAuthenticated, isLoading, login } = useAuthStore();
  const navigate = useNavigate();
  const [error, setError] = useState<string>('');

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (credentials: LoginCredentials) => {
    setError(''); // Clear previous errors
    
    const result = await login(credentials);
    if (result.success) {
      navigate('/', { replace: true });
    } else if (result.error) {
      console.error('Login failed:', result.error.message);
      setError(result.error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <ChatBubbleLeftRightIcon className="w-8 h-8 text-white" aria-hidden="true" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome to Zephix AI
          </h1>
          <p className="text-gray-300 mb-6">
            Your AI-powered project management assistant
          </p>
          <div className="glass p-4 mb-6">
            <div className="flex items-center justify-center space-x-2 mb-3">
              <SparklesIcon className="w-5 h-5 text-indigo-400" aria-hidden="true" />
              <span className="text-sm font-medium text-gray-200">AI-Powered Features</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs text-gray-400">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full" aria-hidden="true"></div>
                <span>Smart Project Management</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full" aria-hidden="true"></div>
                <span>AI Assistant</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-purple-500 rounded-full" aria-hidden="true"></div>
                <span>Real-time Analytics</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-orange-500 rounded-full" aria-hidden="true"></div>
                <span>Team Collaboration</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Login Form */}
        <div className="glass p-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-2">Sign in to your account</h2>
            <p className="text-sm text-gray-400">
              Access your AI-powered project dashboard
            </p>
          </div>
          <LoginForm 
            onSubmit={handleLogin} 
            loading={isLoading} 
            error={error}
          />
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              By signing in, you agree to our terms of service and privacy policy
            </p>
          </div>
        </div>
        
        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-gray-400">
            New to Zephix?{' '}
            <button 
              className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors focus:outline-none focus:underline"
              aria-label="Contact administrator for account access"
            >
              Contact your administrator
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
