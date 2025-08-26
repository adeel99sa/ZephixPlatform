/**
 * Environment Configuration Example
 * Copy this file to env.ts and fill in your actual values
 */

export const ENV_CONFIG = {
  // API Configuration
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  API_TIMEOUT: parseInt(import.meta.env.VITE_API_TIMEOUT || '10000'),
  
  // Analytics Configuration
  GA_ID: import.meta.env.VITE_GA_ID || 'G-XXXXXXXXXX',
  GA_ENABLED: import.meta.env.VITE_GA_ENABLED === 'true',
  VERCEL_ANALYTICS_ENABLED: import.meta.env.VITE_VERCEL_ANALYTICS_ENABLED === 'true',
  
  // Rate Limiting
  RATE_LIMIT_MAX: parseInt(import.meta.env.VITE_RATE_LIMIT_MAX || '3'),
  RATE_LIMIT_WINDOW: parseInt(import.meta.env.VITE_RATE_LIMIT_WINDOW || '3600000'),
  
  // Feature Flags
  ENABLE_WAITLIST: import.meta.env.VITE_ENABLE_WAITLIST !== 'false',
  ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS !== 'false',
  ENABLE_ANIMATIONS: import.meta.env.VITE_ENABLE_ANIMATIONS !== 'false',
  
  // External Services
  CALENDLY_URL: import.meta.env.VITE_CALENDLY_URL || 'https://calendly.com/zephix-demo',
  CONTACT_EMAIL: import.meta.env.VITE_CONTACT_EMAIL || 'hello@zephix.ai',
  
  // Development
  DEV_MODE: import.meta.env.DEV,
  MOCK_API: import.meta.env.VITE_MOCK_API === 'true',
  DEBUG_ANALYTICS: import.meta.env.VITE_DEBUG_ANALYTICS === 'true',
  
  // Performance
  LAZY_LOAD_THRESHOLD: parseFloat(import.meta.env.VITE_LAZY_LOAD_THRESHOLD || '0.1'),
  ANIMATION_DURATION: parseInt(import.meta.env.VITE_ANIMATION_DURATION || '600'),
  DEBOUNCE_DELAY: parseInt(import.meta.env.VITE_DEBOUNCE_DELAY || '300'),
  
  // Security
  CSRF_ENABLED: import.meta.env.VITE_CSRF_ENABLED !== 'false',
  CONTENT_SECURITY_POLICY: import.meta.env.VITE_CONTENT_SECURITY_POLICY !== 'false',
} as const;

// Type for environment variables
export type EnvConfig = typeof ENV_CONFIG;

// Helper function to get environment variable
export const getEnvVar = (key: keyof EnvConfig): string | number | boolean => {
  return ENV_CONFIG[key];
};

// Helper function to check if feature is enabled
export const isFeatureEnabled = (feature: keyof Pick<EnvConfig, 'ENABLE_WAITLIST' | 'ENABLE_ANALYTICS' | 'ENABLE_ANIMATIONS'>): boolean => {
  return ENV_CONFIG[feature];
};

// Helper function to get API URL
export const getApiUrl = (endpoint: string): string => {
  const baseUrl = ENV_CONFIG.API_URL.replace(/\/$/, '');
  const cleanEndpoint = endpoint.replace(/^\//, '');
  return `${baseUrl}/${cleanEndpoint}`;
};

// Helper function to check if in development mode
export const isDevelopment = (): boolean => {
  return ENV_CONFIG.DEV_MODE;
};

// Helper function to check if mock API should be used
export const shouldUseMockApi = (): boolean => {
  return ENV_CONFIG.MOCK_API || ENV_CONFIG.DEV_MODE;
};


