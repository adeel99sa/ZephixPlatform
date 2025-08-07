import { useEffect, useRef } from 'react';
import * as Sentry from '@sentry/react';
import { startSentryTransaction } from '../config/sentry';

interface UseSentryPerformanceOptions {
  name: string;
  operation: string;
  data?: Record<string, unknown>;
  autoFinish?: boolean;
}

/**
 * Custom hook for monitoring component performance with Sentry
 * 
 * @param options - Configuration options for the performance transaction
 * @returns Object with finish method to manually finish the transaction
 */
export const useSentryPerformance = (options: UseSentryPerformanceOptions) => {
  const { name, operation, data, autoFinish = true } = options;
  const transactionRef = useRef<Sentry.Transaction | null>(null);

  useEffect(() => {
    // Start performance transaction
    transactionRef.current = startSentryTransaction(name, operation, data);

    // Auto-finish transaction when component unmounts
    if (autoFinish) {
      return () => {
        if (transactionRef.current) {
          transactionRef.current.finish();
        }
      };
    }
  }, [name, operation, data, autoFinish]);

  const finish = () => {
    if (transactionRef.current) {
      transactionRef.current.finish();
      transactionRef.current = null;
    }
  };

  const setTag = (key: string, value: string) => {
    if (transactionRef.current) {
      transactionRef.current.setTag(key, value);
    }
  };

  const setData = (key: string, value: unknown) => {
    if (transactionRef.current) {
      transactionRef.current.setData(key, value);
    }
  };

  return {
    finish,
    setTag,
    setData,
    transaction: transactionRef.current,
  };
};

/**
 * Hook for monitoring API call performance
 */
export const useSentryApiPerformance = (endpoint: string) => {
  return useSentryPerformance({
    name: `API Call: ${endpoint}`,
    operation: 'http.request',
    data: { endpoint },
    autoFinish: false,
  });
};

/**
 * Hook for monitoring user interaction performance
 */
export const useSentryInteractionPerformance = (interactionName: string) => {
  return useSentryPerformance({
    name: `User Interaction: ${interactionName}`,
    operation: 'ui.interaction',
    data: { interaction: interactionName },
    autoFinish: false,
  });
};

/**
 * Hook for monitoring page load performance
 */
export const useSentryPagePerformance = (pageName: string) => {
  return useSentryPerformance({
    name: `Page Load: ${pageName}`,
    operation: 'navigation',
    data: { page: pageName },
    autoFinish: true,
  });
};
