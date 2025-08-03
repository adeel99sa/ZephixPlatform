# Zephix User Authentication Service

Enterprise-grade user authentication service built with TypeScript, following Clean Architecture principles and Fortune 500 security standards.

## Features

### 🔐 Authentication & Authorization
- **JWT Authentication** with RS256 algorithm
- **Refresh Token Rotation** for enhanced security
- **Role-based Access Control** (RBAC) with multiple user roles
- **Multi-Factor Authentication** (MFA) with TOTP support
- **Account Lockout** mechanisms after failed attempts
- **Password Policies** with enterprise-grade requirements

### 🛡️ Security Features
- **OWASP Security Headers** via Helmet
- **Rate Limiting** with configurable thresholds
- **CORS Protection** for cross-origin requests
- **Input Validation** with comprehensive sanitization
- **SQL Injection Prevention** with parameterized queries
- **XSS Protection** with content security policies
- **Password Hashing** with bcrypt (12+ rounds)

### 📊 Monitoring & Observability
- **Structured Logging** with Winston and correlation IDs
- **Health Check Endpoints** (`/health`, `/ready`)
- **Application Metrics** and performance monitoring
- **Audit Logging** for security events
- **Error Tracking** with detailed stack traces

### 🏗️ Architecture
- **Clean Architecture** implementation
- **Domain-Driven Design** principles
- **Dependency Injection** for loose coupling
- **Repository Pattern** for data access
- **Value Objects** for domain entities
- **DTOs** for API contracts

### 🚀 DevOps & Quality
- **Docker Support** with multi-stage builds
- **GitHub Actions CI/CD** pipeline
- **Comprehensive Testing** (Unit, Integration, E2E)
- **Code Quality** with ESLint and Prettier
- **Security Scanning** with dependency audits

## Quick Start

### Prerequisites
- Node.js 18.18.0+
- PostgreSQL 14+
- Redis 6+
- Docker & Docker Compose (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/zephix/platform.git
   cd platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cd packages/user-auth-service
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Start with Docker (recommended)**
   ```bash
   docker-compose -f docker/docker-compose.yml up -d
   ```

5. **Or start manually**
   ```bash
   # Start PostgreSQL and Redis
   # Then run the service
   npm run dev
   ```

### Environment Configuration

Copy `env.example` to `.env` and configure:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=zephix_user
DB_PASSWORD=zephix_password
DB_NAME=zephix_auth

# JWT Secrets (CHANGE IN PRODUCTION)
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# Redis
REDIS_URL=redis://localhost:6379

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_MAX_REQUESTS=5
```

## API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "user"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "mfaToken": "123456",
  "rememberMe": false
}
```

#### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

#### Request Password Reset
```http
POST /api/auth/request-password-reset
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Reset Password
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset-token",
  "password": "NewSecurePass123!"
}
```

### Protected Endpoints

#### Get Profile
```http
GET /api/auth/profile
Authorization: Bearer your-access-token
```

#### Update Profile
```http
PUT /api/auth/profile
Authorization: Bearer your-access-token
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@example.com"
}
```

#### Change Password
```http
POST /api/auth/change-password
Authorization: Bearer your-access-token
Content-Type: application/json

{
  "currentPassword": "OldPass123!",
  "newPassword": "NewSecurePass123!"
}
```

### MFA Endpoints

#### Setup MFA
```http
POST /api/auth/mfa/setup
Authorization: Bearer your-access-token
```

#### Verify MFA
```http
POST /api/auth/mfa/verify
Authorization: Bearer your-access-token
Content-Type: application/json

{
  "mfaToken": "123456"
}
```

#### Disable MFA
```http
POST /api/auth/mfa/disable
Authorization: Bearer your-access-token
```

### Health Check Endpoints

#### Health Check
```http
GET /health
```

#### Readiness Check
```http
GET /ready
```

#### Application Info
```http
GET /health/info
```

#### Metrics
```http
GET /health/metrics
```

## Development

### Project Structure
```
src/
├── api/                    # API Layer
│   ├── controllers/        # Request handlers
│   ├── middleware/         # Express middleware
│   ├── routes/            # Route definitions
│   └── validators/        # Input validation
├── application/            # Application Layer
│   ├── services/          # Business logic
│   ├── interfaces/        # Service contracts
│   └── dto/              # Data Transfer Objects
├── domain/                # Domain Layer
│   ├── entities/          # Domain entities
│   ├── repositories/      # Repository interfaces
│   └── value-objects/    # Value objects
├── infrastructure/         # Infrastructure Layer
│   ├── database/          # Database configuration
│   ├── config/           # Application config
│   ├── logging/          # Logging setup
│   └── monitoring/       # Monitoring tools
└── shared/               # Shared utilities
    ├── types/            # TypeScript types
    ├── utils/            # Utility functions
    ├── constants/        # Application constants
    └── errors/           # Error classes
```

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server

# Testing
npm run test             # Run unit tests
npm run test:watch       # Run tests in watch mode
npm run test:integration # Run integration tests
npm run test:e2e         # Run end-to-end tests

# Code Quality
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
npm run typecheck        # TypeScript type checking

# Security
npm run security:audit   # Run security audit
npm run security:deps    # Check dependency vulnerabilities

# Database
npm run migrate          # Run database migrations
npm run migrate:generate # Generate new migration
npm run seed             # Seed database with test data

# Docker
npm run docker:build     # Build Docker image
npm run docker:build:dev # Build development image
```

### Testing

The service includes comprehensive testing:

- **Unit Tests**: Test individual functions and classes
- **Integration Tests**: Test API endpoints and database operations
- **E2E Tests**: Test complete user workflows
- **Security Tests**: Test authentication and authorization flows

Run tests with coverage:
```bash
npm run test -- --coverage
```

### Code Quality

The project enforces high code quality standards:

- **ESLint**: Code linting with TypeScript rules
- **Prettier**: Code formatting
- **TypeScript**: Strict type checking
- **Husky**: Git hooks for pre-commit validation

## Security Features

### Password Policies
- Minimum 8 characters
- Must contain uppercase, lowercase, number, and special character
- Prevents common weak passwords
- No repeated or sequential characters

### Account Security
- Account lockout after 5 failed attempts
- 30-minute lockout duration
- Password expiry after 90 days
- Email verification required for login

### JWT Security
- RS256 algorithm for signing
- Short-lived access tokens (15 minutes)
- Long-lived refresh tokens (7 days)
- Token rotation on refresh

### MFA Support
- TOTP (Time-based One-Time Password)
- QR code generation for easy setup
- Backup codes for account recovery
- Configurable MFA requirements

## Monitoring & Observability

### Health Checks
- `/health`: Overall service health
- `/ready`: Service readiness for traffic
- `/health/info`: Service information
- `/health/metrics`: Application metrics

### Logging
- Structured JSON logging
- Correlation IDs for request tracing
- Different log levels (error, warn, info, debug)
- Audit logging for security events

### Metrics
- Memory usage
- CPU usage
- Database connection metrics
- Request/response times
- Error rates

## Deployment

### Docker Deployment

1. **Build the image**
   ```bash
   docker build -f docker/Dockerfile -t zephix/user-auth-service .
   ```

2. **Run with Docker Compose**
   ```bash
   docker-compose -f docker/docker-compose.yml up -d
   ```

### Production Deployment

1. **Set production environment variables**
   ```bash
   NODE_ENV=production
   JWT_SECRET=your-production-secret
   JWT_REFRESH_SECRET=your-production-refresh-secret
   ```

2. **Configure database and Redis**
   ```bash
   DB_HOST=your-production-db
   REDIS_URL=your-production-redis
   ```

3. **Start the service**
   ```bash
   npm run build
   npm start
   ```

### Kubernetes Deployment

The service includes Kubernetes manifests for deployment:

```bash
kubectl apply -f k8s/
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Development Guidelines

- Follow TypeScript strict mode
- Write comprehensive tests
- Use conventional commits
- Document all public APIs
- Follow the existing code style

## License

MIT License - see [LICENSE](../../LICENSE) file for details.

## Support

For enterprise support and consulting:
- Email: enterprise@zephix.com
- Documentation: https://docs.zephix.com
- Status: https://status.zephix.com 