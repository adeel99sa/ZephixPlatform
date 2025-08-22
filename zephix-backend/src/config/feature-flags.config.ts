import { registerAs } from '@nestjs/config';

export interface FeatureFlags {
  // Core features (always enabled)
  auth: boolean;
  organizations: boolean;
  projects: boolean;
  
  // Optional features (controlled by environment)
  aiModule: boolean;
  governanceModule: boolean;
  documentProcessing: boolean;
  telemetry: boolean;
  adminPanel: boolean;
  workflows: boolean;
}

export default registerAs('features', (): FeatureFlags => ({
  // Core features - always true
  auth: true,
  organizations: true,
  projects: true,
  
  // Optional features - read from environment
  aiModule: process.env.ENABLE_AI_MODULE === 'true',
  governanceModule: process.env.ENABLE_GOVERNANCE === 'true',
  documentProcessing: process.env.ENABLE_DOCUMENTS === 'true',
  telemetry: process.env.ENABLE_TELEMETRY === 'true',
  adminPanel: process.env.ENABLE_ADMIN === 'true',
  workflows: process.env.ENABLE_WORKFLOWS === 'true',
}));
