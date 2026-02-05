import { useEffect, useRef } from 'react';
import { startSentryTransaction } from '../config/sentry';

interface UseSentryPerformanceOptions {
  name: string;
  operation: string;
  data?: Record<string, unknown>;
  autoFinish?: boolean;
}

// Stub transaction interface for when Sentry is not fully initialized
interface StubTransaction {
  finish: () => void;
  setTag: (key: string, value: string) => void;
  setData: (key: string, value: unknown) => void;
}

/**
 * Custom hook for monitoring component performance with Sentry
 * 
 * @param options - Configuration options for the performance transaction
 * @returns Object with finish method to manually finish the transaction
 */
export const useSentryPerformance = (options: UseSentryPerformanceOptions) => {
  const { name, operation, data, autoFinish = true } = options;
  // startSentryTransaction currently returns null - this is a placeholder for future implementation
  const transactionRef = useRef<StubTransaction | null>(null);

  useEffect(() => {
    // Start performance transaction - currently returns null, will be implemented when Sentry is configured
    const tx = startSentryTransaction(name, operation, data);
    // If startSentryTransaction returns a real transaction in the future, use it
    transactionRef.current = tx as StubTransaction | null;

    // Auto-finish transaction when component unmounts
    if (autoFinish) {
      return () => {
        transactionRef.current?.finish();
      };
    }
  }, [name, operation, data, autoFinish]);

  const finish = () => {
    transactionRef.current?.finish();
    transactionRef.current = null;
  };

  const setTag = (key: string, value: string) => {
    transactionRef.current?.setTag(key, value);
  };

  const setData = (key: string, value: unknown) => {
    transactionRef.current?.setData(key, value);
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
