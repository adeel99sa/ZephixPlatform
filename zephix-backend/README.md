# Zephix Backend

A secure, scalable NestJS backend service for the Zephix project management platform with built-in AI capabilities, comprehensive security features, and enterprise-grade monitoring.

## Features

- 🔐 **JWT Authentication** with role-based access control (RBAC)
- 🛡️ **Security Headers** via Helmet with configurable CSP
- 🌐 **CORS Configuration** with environment-specific origin validation  
- ⚡ **Rate Limiting** with per-route overrides (global + auth-specific)
- 🏥 **Health Checks** and system metrics endpoints
- 🗄️ **PostgreSQL** with TypeORM and automatic migrations
- 🤖 **AI Integration** with Claude/Anthropic support
- 📊 **Project Management** features with comprehensive PM workflows
- 🔄 **Status Reporting** with external integrations (Jira, GitHub, Teams)
- 📈 **Risk Management** with AI-powered analysis

## Environment Configuration

Create a `.env` file based on the following template:

### Required Environment Variables

```bash
# Environment
NODE_ENV=development                    # development | production | test

# Server
PORT=3000

# Database (use DATABASE_URL or individual settings)
DATABASE_URL=postgresql://user:pass@localhost:5432/zephix_db
# OR
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_DATABASE=zephix_db
DB_LOGGING=false
RUN_MIGRATIONS_ON_BOOT=false

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=15m

# CORS Security
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://app.getzephix.com,https://getzephix.com

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000              # 1 minute
RATE_LIMIT_MAX=60                       # 60 requests per minute per IP
AUTH_RATE_LIMIT_WINDOW_MS=900000        # 15 minutes  
AUTH_RATE_LIMIT_MAX=5                   # 5 auth attempts per 15 minutes

# Security Headers
HELMET_ENABLED=true

# AI/LLM Configuration
ANTHROPIC_API_KEY=your-anthropic-api-key
ANTHROPIC_MODEL=claude-3-sonnet-20240229
ANTHROPIC_MAX_TOKENS=4000
ANTHROPIC_API_VERSION=2023-06-01
ANTHROPIC_DATA_RETENTION_OPT_OUT=true
ANTHROPIC_ENABLE_DATA_COLLECTION=false

# LLM Provider Settings
LLM_PROVIDER=anthropic
LLM_ENFORCE_NO_DATA_RETENTION=true
LLM_LOG_PROVIDER_SETTINGS=true
LLM_VALIDATE_ON_STARTUP=true

# Observability & Monitoring
LOG_LEVEL=info                              # trace, debug, info, warn, error
OTEL_ENABLED=true                           # OpenTelemetry tracing
OTEL_SERVICE_NAME=zephix-backend           # Service name in traces
METRICS_ENABLED=true                        # Prometheus metrics
METRICS_PATH=/api/metrics                   # Metrics endpoint path
```

### External Integrations (Optional)

```bash
# Jira Integration
JIRA_BASE_URL=https://company.atlassian.net
JIRA_USERNAME=user@company.com
JIRA_API_TOKEN=your-jira-token

# GitHub Integration  
GITHUB_TOKEN=your-github-token
GITHUB_BASE_URL=https://api.github.com

# Teams Integration
TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/your-webhook

# Financial APIs
FINANCIAL_API_KEY=your-key
FINANCIAL_BASE_URL=https://api.financial-service.com

# Export Services
PDF_SERVICE_URL=https://pdf-export.com
PPTX_SERVICE_URL=https://pptx-export.com  
EXCEL_SERVICE_URL=https://excel-export.com

# Alert Services
EMAIL_SERVICE_URL=https://email-service.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your-webhook
```

### Environment-Specific Examples

**Development:**
```bash
NODE_ENV=development
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
RATE_LIMIT_ENABLED=false
HELMET_ENABLED=true
DB_LOGGING=true
```

**Production:**
```bash
NODE_ENV=production  
CORS_ALLOWED_ORIGINS=https://app.getzephix.com,https://getzephix.com
RATE_LIMIT_ENABLED=true
HELMET_ENABLED=true
DB_LOGGING=false
RUN_MIGRATIONS_ON_BOOT=true
```

**Testing:**
```bash
NODE_ENV=test
RATE_LIMIT_ENABLED=false
HELMET_ENABLED=false
DB_LOGGING=false
```

## Project Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations (if needed)
npm run db:migrate
```

## Development

```bash
# Start in development mode with hot reload
npm run start:dev

# Start in production mode
npm run start:prod

# Build the application
npm run build
```

## API Endpoints

### Public Endpoints (No Authentication)

| Endpoint | Method | Description | Rate Limit |
|----------|--------|-------------|------------|
| `/api/_status` | GET | Service status (public) | None |
| `/api/health` | GET | Health check with DB status | None |
| `/api/metrics` | GET | Prometheus metrics (public) | None |

### Protected Endpoints (Require Authentication)

| Endpoint | Method | Description | Rate Limit |
|----------|--------|-------------|------------|
| `/api/metrics/json` | GET | JSON system metrics (protected) | None |
| `/api/llm-provider` | GET | LLM provider settings and compliance (protected) | None |
| `/api/auth/login` | POST | User authentication | 5/15min |
| `/api/auth/register` | POST | User registration | 5/15min |

### Response Examples

**Health Check:**
```bash
curl -X GET http://localhost:3000/api/health
```

```json
{
  "statusCode": 200,
  "status": "ok",
  "timestamp": "2025-01-09T00:00:00.000Z",
  "service": "Zephix Backend Service",
  "database": "connected",
  "environment": "development",
  "version": "1.0.0",
  "build": {
    "sha": "abc123",
    "timestamp": "2025-01-09T00:00:00.000Z"
  }
}
```

**CORS Preflight:**
```bash
curl -X OPTIONS http://localhost:3000/api/health \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET"
```

Expected headers:
- `Access-Control-Allow-Origin: http://localhost:3000`
- `Access-Control-Allow-Methods: GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS`

## Testing

```bash
# Unit tests
npm run test

# E2E tests  
npm run test:e2e

# Test coverage
npm run test:cov

# Smoke tests (verify bootstrap and health)
npm run test:e2e -- test/app.e2e-spec.ts
```

## Security Features

### Rate Limiting
- **Global**: 60 requests/minute per IP
- **Auth endpoints**: 5 attempts/15 minutes per IP  
- **Health/Status**: No limits

### CORS
- Environment-specific origin validation
- Development mode allows all origins if none specified
- Production requires explicit origin whitelist

### Security Headers (Helmet)
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: enabled

### LLM Provider Data Retention
- **No Training Data**: ANTHROPIC_DATA_RETENTION_OPT_OUT=true prevents data use for training
- **No Data Collection**: ANTHROPIC_ENABLE_DATA_COLLECTION=false disables data collection
- **Startup Validation**: Validates compliance on application startup
- **Compliance Monitoring**: Real-time compliance status checks
- **Audit Logging**: All LLM requests logged with compliance status

### Observability & Monitoring
- **Structured Logging**: Pino JSON logger with request ID tracing
- **OpenTelemetry**: Distributed tracing for HTTP requests and business logic
- **Prometheus Metrics**: Comprehensive metrics for HTTP, errors, LLM usage, and system resources
- **Request Tracing**: Automatic request ID generation and propagation
- **Error Tracking**: Centralized error counting and categorization

## Manual Testing

Start the server:
```bash
# With rate limiting enabled
RATE_LIMIT_ENABLED=true CORS_ALLOWED_ORIGINS=http://localhost:3000 npm run start:dev
```

Test endpoints:
```bash
# Health check
curl -i http://localhost:3000/api/health

# Status endpoint  
curl -i http://localhost:3000/api/_status

# CORS preflight
curl -i -X OPTIONS http://localhost:3000/api/health \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET"

# Protected endpoint (should return 401)
curl -i http://localhost:3000/api/metrics/json

# Test rate limiting (make multiple requests quickly)
for i in {1..65}; do curl -s http://localhost:3000/api/health > /dev/null; done
curl -i http://localhost:3000/api/health  # Should show rate limit headers

# Test observability endpoints
curl -i http://localhost:3000/api/metrics  # Prometheus metrics
curl -i http://localhost:3000/api/metrics/json  # JSON metrics (requires auth)
```

Expected responses:
- Health/Status: 200 with JSON response
- CORS preflight: 200 with `Access-Control-Allow-Origin` header
- Metrics without auth: 401 Unauthorized
- Rate limiting: 429 after exceeding limits (except for health/status endpoints)

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
# Railway deployment fix
