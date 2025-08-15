import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  url: process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL || 'redis://localhost:6379',
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  username: process.env.REDIS_USERNAME,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  
  // Railway-optimized connection settings
  connection: {
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    maxLoadingTimeout: 10000,
    lazyConnect: true,
  },
  
  // Queue-specific settings
  queue: {
    defaultJobOptions: {
      removeOnComplete: 100, // Keep last 100 completed jobs
      removeOnFail: 50,      // Keep last 50 failed jobs
      attempts: 3,           // Retry failed jobs 3 times
      backoff: {
        type: 'exponential',
        delay: 2000,         // Start with 2s delay
      },
    },
    // Memory optimization for Railway
    settings: {
      stalledInterval: 30000,    // Check for stalled jobs every 30s
      maxStalledCount: 1,       // Max stalled jobs before marking as failed
      guardInterval: 5000,       // Guard interval for job processing
      retryProcessDelay: 5000,   // Delay before retrying failed jobs
    },
  },
  
  // BullMQ specific settings
  bullmq: {
    prefix: process.env.REDIS_PREFIX || 'zephix',
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      delay: 0,
      priority: 0,
      lifo: false,
      timeout: 300000, // 5 minutes timeout
    },
  },
}));
