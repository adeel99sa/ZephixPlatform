import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { LoginForm } from '../../components/forms/LoginForm';
import { useAuthStore } from '../../stores/authStore';
import { authApi } from '../../services/api';
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
      toast.success(`Welcome back, ${response.user.firstName}!`);
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Login failed:', error);
      // Error handling is done in the API interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to Zephix
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Access your project management dashboard
          </p>
        </div>
        
        <div className="bg-white py-8 px-6 shadow rounded-lg">
          <LoginForm onSubmit={handleLogin} loading={isLoading} />
        </div>
      </div>
    </div>
  );
}; 