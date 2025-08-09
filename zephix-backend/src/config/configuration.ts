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
    runMigrationsOnBoot: process.env.RUN_MIGRATIONS_ON_BOOT === 'true',
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
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
