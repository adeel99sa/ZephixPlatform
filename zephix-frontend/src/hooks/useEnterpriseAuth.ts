/**
 * Enterprise Security Authentication Hook
 * Provides secure authentication methods with full security monitoring
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { apiJson } from '../services/api';

export const useEnterpriseAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  
  const { user, accessToken, isAuthenticated, login: storeLogin, logout: storeLogout } = useAuthStore();

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await apiJson('/auth/login', { method: 'POST', body: { email, password } });
      console.log("✅ API Response:", res);
      const token = res?.accessToken;
      
      if (!token) throw new Error('TOKEN_MISSING');
      
      // Update the store with the response data
      const { user, expiresIn } = res;
      const expiresAt = Date.now() + (expiresIn * 1000);
      
      // Update the store directly
      useAuthStore.setState({
        user,
        accessToken: token,  // CORRECT PROPERTY NAME
        isAuthenticated: true,
        expiresAt,
        isLoading: false,
      });
      
      // Navigate to dashboard
      navigate('/dashboard');
      
      return true;
    } catch (err) {
      console.error("Signup error:", err);
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  const signup = useCallback(async (userData: any) => {
    setIsLoading(true);
    console.log("🚀 Signup hook called with:", userData);
    console.log("📡 About to call API /auth/signup");
    setError(null);
    
    try {
      const res = await apiJson('/auth/signup', { method: 'POST', body: userData });
      console.log("✅ API Response:", res);
      const token = res?.accessToken;
      
      if (!token) throw new Error('TOKEN_MISSING');
      
      // Update the store with the response data
      const { user, expiresIn } = res;
      const expiresAt = Date.now() + (expiresIn * 1000);
      
      // Update the store directly
      useAuthStore.setState({
        user,
        accessToken: token,  // CORRECT PROPERTY NAME
        isAuthenticated: true,
        expiresAt,
        isLoading: false,
      });
      
      // Navigate to dashboard
      navigate('/dashboard');
      
      return true;
    } catch (err) {
      console.error("Signup error:", err);
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  const logout = useCallback(async () => {
    try {
      await apiJson('/auth/logout', { method: 'POST' });
    } catch (err) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', err);
    } finally {
      storeLogout();
      navigate('/login');
    }
  }, [storeLogout, navigate]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    error,
    login,
    signup,
    logout,
    clearError,
    // Add authState for compatibility with SignupPage
    authState: {
      user,
      isAuthenticated,
      isLoading,
    },
  };
};