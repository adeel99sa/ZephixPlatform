import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.string().default('3000'),
  
  // Database
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.string().default('5432'),
  DB_NAME: Joi.string().default('brd_system'),
  DB_USER: Joi.string().default('postgres'),
  DB_PASSWORD: Joi.string().required(),
  
  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.string().default('6379'),
  REDIS_PASSWORD: Joi.string().optional(),
  
  // JWT
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  
  // OAuth
  GOOGLE_CLIENT_ID: Joi.string().optional(),
  GOOGLE_CLIENT_SECRET: Joi.string().optional(),
  
  // OpenAI
  OPENAI_API_KEY: Joi.string().required(),
  OPENAI_MODEL: Joi.string().default('gpt-4-turbo-preview'),
  
  // Frontend URL
  FRONTEND_URL: Joi.string().default('http://localhost:3001'),
  
  // File Upload
  MAX_FILE_SIZE: Joi.string().default('10485760'), // 10MB
  ALLOWED_FILE_TYPES: Joi.string().default('pdf,doc,docx,xls,xlsx,png,jpg,jpeg'),
}).unknown();

const { error, value: parsedEnv } = envSchema.validate(process.env);

if (error) {
  console.error('❌ Invalid environment variables:', error.details);
  throw new Error('Invalid environment variables');
}

export const config = {
  env: parsedEnv.NODE_ENV,
  port: parseInt(parsedEnv.PORT),
  
  database: {
    host: parsedEnv.DB_HOST,
    port: parseInt(parsedEnv.DB_PORT),
    name: parsedEnv.DB_NAME,
    user: parsedEnv.DB_USER,
    password: parsedEnv.DB_PASSWORD,
    logging: parsedEnv.NODE_ENV === 'development',
  },
  
  redis: {
    host: parsedEnv.REDIS_HOST,
    port: parseInt(parsedEnv.REDIS_PORT),
    password: parsedEnv.REDIS_PASSWORD,
  },
  
  jwt: {
    secret: parsedEnv.JWT_SECRET,
    expiresIn: parsedEnv.JWT_EXPIRES_IN,
  },
  
  oauth: {
    google: {
      clientId: parsedEnv.GOOGLE_CLIENT_ID,
      clientSecret: parsedEnv.GOOGLE_CLIENT_SECRET,
    },
  },
  
  openai: {
    apiKey: parsedEnv.OPENAI_API_KEY,
    model: parsedEnv.OPENAI_MODEL,
  },
  
  frontend: {
    url: parsedEnv.FRONTEND_URL,
  },
  
  upload: {
    maxFileSize: parseInt(parsedEnv.MAX_FILE_SIZE),
    allowedFileTypes: parsedEnv.ALLOWED_FILE_TYPES.split(','),
  },
};