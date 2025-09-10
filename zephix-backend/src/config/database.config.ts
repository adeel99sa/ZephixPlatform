export const databaseConfig = {
  type: 'postgres' as const,
  url: process.env.DATABASE_URL,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: false, // NEVER true in production
  logging: process.env.NODE_ENV === 'development',
  
  // ADD THESE FOR PRODUCTION:
  extra: {
    max: 10, // Maximum pool size
    min: 2,  // Minimum pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    statement_timeout: 30000, // 30 seconds
  }
};