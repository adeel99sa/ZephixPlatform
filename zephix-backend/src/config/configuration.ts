export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    synchronize: true, // Enable synchronization to create tables
    logging: process.env.DB_LOGGING === 'true',
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  },
});
