import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  
  // JWT Configuration
  JWT_ALG: Joi.string()
    .valid('HS256', 'RS256')
    .default('HS256'),
  JWT_SECRET: Joi.when('JWT_ALG', {
    is: 'HS256',
    then: Joi.string().min(16).required(),
    otherwise: Joi.string().optional(),
  }),
  JWT_PUBLIC_KEY: Joi.when('JWT_ALG', {
    is: 'RS256',
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  JWT_PRIVATE_KEY: Joi.when('JWT_ALG', {
    is: 'RS256',
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.when('JWT_ALG', {
    is: 'HS256',
    then: Joi.string().min(16).required(),
    otherwise: Joi.string().optional(),
  }),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  JWT_REFRESH_PUBLIC_KEY: Joi.when('JWT_ALG', {
    is: 'RS256',
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  JWT_REFRESH_PRIVATE_KEY: Joi.when('JWT_ALG', {
    is: 'RS256',
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  JWT_ISSUER: Joi.string().default('zephix-backend'),
  JWT_AUDIENCE: Joi.string().default('zephix-frontend'),
  JWT_REFRESH_AUDIENCE: Joi.string().default('zephix-refresh'),
  JWT_KEY_ID: Joi.string().optional(),
  JWT_ROTATION_GRACE_WINDOW: Joi.number().default(300000), // 5 minutes
  
  // Database Configuration
  DATABASE_URL: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().uri().required(),
    otherwise: Joi.string().uri().optional(),
  }),
  DB_HOST: Joi.string().optional(),
  DB_PORT: Joi.number().port().default(5432),
  DB_USERNAME: Joi.string().optional(),
  DB_PASSWORD: Joi.string().optional(),
  DB_DATABASE: Joi.string().optional(),
  
  // Security Configuration
  SECURITY_VIRUS_SCAN_ENABLED: Joi.boolean().default(true),
  SECURITY_MAX_FILE_SIZE: Joi.number().default(100 * 1024 * 1024), // 100MB
  
  // Rate Limiting
  RATE_LIMIT_ENABLED: Joi.boolean().default(true),
  RATE_LIMIT_WINDOW_MS: Joi.number().default(60000), // 1 minute
  RATE_LIMIT_MAX: Joi.number().default(60), // 60 requests per minute
  AUTH_RATE_LIMIT_WINDOW_MS: Joi.number().default(900000), // 15 minutes
  AUTH_RATE_LIMIT_MAX: Joi.number().default(5), // 5 auth attempts per 15 minutes
  
  // AI Configuration
  AI_MAX_FILE_SIZE: Joi.number().default(25 * 1024 * 1024), // 25MB
  AI_ALLOWED_FILE_TYPES: Joi.string().default('.pdf,.docx,.doc,.txt'),
  AI_VIRUS_SCANNING_ENABLED: Joi.boolean().default(true),
  
  // CORS Configuration
  CORS_ORIGINS: Joi.string().default('http://localhost:3000,http://localhost:5173'),
  CORS_CREDENTIALS: Joi.boolean().default(true),
  CORS_METHODS: Joi.string().default('GET,HEAD,PUT,PATCH,POST,DELETE'),
  
  // Emergency Mode
  SKIP_DATABASE: Joi.boolean().default(false),
  
  // Logging Configuration
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info'),
  LOG_FORMAT: Joi.string()
    .valid('json', 'simple')
    .default('json'),
});
