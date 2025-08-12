import { useEffect, useCallback } from 'react';

interface AnalyticsEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
}

export const useAnalytics = () => {
  const trackEvent = useCallback((event: AnalyticsEvent) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', event.action, {
        event_category: event.category,
        event_label: event.label,
        value: event.value
      });
    }
  }, []);

  const trackDemoProgress = useCallback((step: string, duration?: number) => {
    trackEvent({
      category: 'Demo Progress',
      action: step,
      value: duration
    });
  }, [trackEvent]);

  const trackDemoConversion = useCallback((type: 'trial' | 'demo' | 'contact') => {
    trackEvent({
      category: 'Demo Conversion',
      action: 'click',
      label: type
    });
  }, [trackEvent]);

  const trackDemoEngagement = useCallback((element: string, time: number) => {
    trackEvent({
      category: 'Demo Engagement',
      action: 'interact',
      label: element,
      value: Math.round(time)
    });
  }, [trackEvent]);

  // Track time spent on demo
  useEffect(() => {
    const startTime = Date.now();

    return () => {
      const timeSpent = (Date.now() - startTime) / 1000; // Convert to seconds
      trackEvent({
        category: 'Demo Performance',
        action: 'time_spent',
        value: Math.round(timeSpent)
      });
    };
  }, [trackEvent]);

  return {
    trackEvent,
    trackDemoProgress,
    trackDemoConversion,
    trackDemoEngagement
  };
};