export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  environment: process.env.NODE_ENV || 'development',
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    synchronize: true, // Enable synchronization to create tables
    logging: process.env.DB_LOGGING === 'true',
    runMigrationsOnBoot: process.env.RUN_MIGRATIONS_ON_BOOT === 'true',
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  },
  app: {
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  },
  email: {
    fromAddress: process.env.EMAIL_FROM_ADDRESS || 'noreply@zephix.com',
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER,
      password: process.env.SMTP_PASSWORD,
    },
  },
  security: {
    cors: {
      allowedOrigins: process.env.CORS_ALLOWED_ORIGINS || '',
    },
    rateLimit: {
      enabled: process.env.RATE_LIMIT_ENABLED === 'true',
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
      max: parseInt(process.env.RATE_LIMIT_MAX || '60', 10), // 60 requests per minute per IP
      authWindowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
      authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '5', 10), // 5 auth attempts per 15 minutes
    },
    helmet: {
      enabled: process.env.HELMET_ENABLED !== 'false', // Default enabled
    },
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
    maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || '4000', 10),
    apiVersion: process.env.ANTHROPIC_API_VERSION || '2023-06-01',
    dataRetentionOptOut: process.env.ANTHROPIC_DATA_RETENTION_OPT_OUT === 'true',
    enableDataCollection: process.env.ANTHROPIC_ENABLE_DATA_COLLECTION === 'true',
  },
  llm: {
    provider: process.env.LLM_PROVIDER || 'anthropic',
    enforceNoDataRetention: process.env.LLM_ENFORCE_NO_DATA_RETENTION !== 'false', // Default true
    logProviderSettings: process.env.LLM_LOG_PROVIDER_SETTINGS !== 'false', // Default true
    validateOnStartup: process.env.LLM_VALIDATE_ON_STARTUP !== 'false', // Default true
  },
  observability: {
    logging: {
      level: process.env.LOG_LEVEL || 'info',
      prettyPrint: process.env.NODE_ENV === 'development',
    },
    telemetry: {
      enabled: process.env.OTEL_ENABLED !== 'false', // Default true
      serviceName: process.env.OTEL_SERVICE_NAME || 'zephix-backend',
      serviceVersion: process.env.npm_package_version || '1.0.0',
    },
    metrics: {
      enabled: process.env.METRICS_ENABLED !== 'false', // Default true
      path: process.env.METRICS_PATH || '/api/metrics',
    },
  },
  statusReporting: {
    // External integrations
    jira: {
      baseUrl: process.env.JIRA_BASE_URL,
      username: process.env.JIRA_USERNAME,
      apiToken: process.env.JIRA_API_TOKEN,
    },
    github: {
      baseUrl: process.env.GITHUB_BASE_URL || 'https://api.github.com',
      token: process.env.GITHUB_TOKEN,
    },
    teams: {
      webhookUrl: process.env.TEAMS_WEBHOOK_URL,
    },
    financial: {
      apiKey: process.env.FINANCIAL_API_KEY,
      baseUrl: process.env.FINANCIAL_BASE_URL,
    },
    // Export service configuration
    export: {
      pdfServiceUrl: process.env.PDF_SERVICE_URL,
      pptxServiceUrl: process.env.PPTX_SERVICE_URL,
      excelServiceUrl: process.env.EXCEL_SERVICE_URL,
    },
    // Alert notification settings
    alerts: {
      emailServiceUrl: process.env.EMAIL_SERVICE_URL,
      slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
      teamsWebhookUrl: process.env.TEAMS_WEBHOOK_URL,
    },
    // Report generation settings
    reports: {
      defaultFormat: process.env.DEFAULT_REPORT_FORMAT || 'detailed',
      maxReportSize: parseInt(process.env.MAX_REPORT_SIZE || '10485760', 10), // 10MB
      retentionDays: parseInt(process.env.REPORT_RETENTION_DAYS || '365', 10),
    },
  },
});
