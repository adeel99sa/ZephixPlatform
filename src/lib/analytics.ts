import posthog from 'posthog-js';

export const initAnalytics = () => {
  if (typeof window !== 'undefined') {
    posthog.init('YOUR_POSTHOG_KEY', {
      api_host: 'https://app.posthog.com',
      capture_pageview: true,
      capture_pageleave: true
    });
  }
};

export const trackEvent = (event: string, properties?: any) => {
  if (typeof window !== 'undefined') {
    posthog.capture(event, properties);
  }
};
