import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { apiRequest } from '../services/api.service';
import toast from 'react-hot-toast';

interface UseApiOptions {
  retryCount?: number;
  retryDelay?: number;
  autoRetry?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

interface UseApiReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
  refetch: () => void;
}

export function useApi<T = any>(
  endpoint: string,
  options: UseApiOptions = {}
): UseApiReturn<T> {
  const {
    retryCount = 3,
    retryDelay = 1000,
    autoRetry = true,
    onSuccess,
    onError
  } = options;

  const { user } = useAuthStore();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryAttempts, setRetryAttempts] = useState(0);

  const makeRequest = useCallback(async (isRetry = false) => {
    if (!user?.organizationId) {
      const errorMsg = 'Organization context required';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiRequest(endpoint, {
        headers: {
          'X-Org-Id': user.organizationId
        }
      });

      setData(response || response);
      setRetryAttempts(0);
      onSuccess?.(response || response);
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to fetch data';
      setError(errorMessage);
      
      // Auto-retry logic
      if (autoRetry && retryAttempts < retryCount && !isRetry) {
        setTimeout(() => {
          setRetryAttempts(prev => prev + 1);
          makeRequest(true);
        }, retryDelay * Math.pow(2, retryAttempts)); // Exponential backoff
      } else {
        onError?.(err);
        if (retryAttempts >= retryCount) {
          toast.error(`Failed after ${retryCount} attempts: ${errorMessage}`);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [endpoint, user?.organizationId, retryCount, retryDelay, autoRetry, retryAttempts, onSuccess, onError]);

  const retry = useCallback(() => {
    setRetryAttempts(0);
    makeRequest();
  }, [makeRequest]);

  const refetch = useCallback(() => {
    makeRequest();
  }, [makeRequest]);

  // Initial fetch
  useEffect(() => {
    makeRequest();
  }, [makeRequest]);

  return {
    data,
    loading,
    error,
    retry,
    refetch
  };
}

// Hook for mutations (POST, PUT, PATCH, DELETE)
export function useApiMutation<T = any>(
  endpoint: string,
  options: UseApiOptions = {}
) {
  const {
    retryCount = 2,
    retryDelay = 1000,
    autoRetry = true,
    onSuccess,
    onError
  } = options;

  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST',
    body?: any,
    customEndpoint?: string
  ) => {
    if (!user?.organizationId) {
      const errorMsg = 'Organization context required';
      setError(errorMsg);
      onError?.(errorMsg);
      return { success: false, error: errorMsg };
    }

    try {
      setLoading(true);
      setError(null);

      const targetEndpoint = customEndpoint || endpoint;
      const response = await apiRequest(targetEndpoint, {
        method,
        body,
        headers: {
          'X-Org-Id': user.organizationId
        }
      });

      setError(null);
      onSuccess?.(response);
      return { success: true, data: response };
    } catch (err: any) {
      const errorMessage = err?.message || 'Operation failed';
      setError(errorMessage);
      onError?.(err);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [endpoint, user?.organizationId, onSuccess, onError]);

  return {
    mutate,
    loading,
    error,
    clearError: () => setError(null)
  };
}
