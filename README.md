# Zephix Authentication Service

Enterprise-grade user authentication service built with NestJS, TypeORM, Passport.js, and JWT.

## 🚀 Features

- **User Registration & Login** - Secure user authentication with bcrypt password hashing
- **JWT Authentication** - Stateless authentication with access and refresh tokens
- **Input Validation** - Comprehensive validation using class-validator
- **Rate Limiting** - Protection against brute force attacks
- **API Documentation** - Auto-generated Swagger documentation
- **Security Middleware** - Helmet, CORS, and compression
- **Database Integration** - PostgreSQL with TypeORM
- **Testing** - Unit and e2e tests with Jest

## 🛠️ Tech Stack

- **Framework**: NestJS
- **Database**: PostgreSQL with TypeORM
- **Authentication**: Passport.js with JWT
- **Validation**: class-validator & class-transformer
- **Documentation**: Swagger/OpenAPI
- **Security**: bcryptjs, helmet, rate limiting
- **Testing**: Jest, Supertest

## 📋 Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd nestjs-auth-service
npm install
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=zephix_user
DB_PASSWORD=zephix_secure_password_2024
DB_DATABASE=zephix_auth_db
DB_LOGGING=false

# JWT Configuration
JWT_SECRET=zephix-enterprise-jwt-secret-key-2024-production-ready
JWT_REFRESH_SECRET=zephix-enterprise-refresh-secret-key-2024-production-ready
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Security Configuration
BCRYPT_ROUNDS=12
THROTTLE_TTL=60
THROTTLE_LIMIT=10
```

### 3. Database Setup

```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create database and user
CREATE DATABASE zephix_auth_db;
CREATE USER zephix_user WITH PASSWORD 'zephix_secure_password_2024';
GRANT ALL PRIVILEGES ON DATABASE zephix_auth_db TO zephix_user;
\q
```

### 4. Start the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## 📚 API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:3001/api/docs
- **Health Check**: http://localhost:3001/api/health

## 🔑 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/profile` | Get current user profile |

### Request Examples

#### Register User
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

#### Login User
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

#### Get Profile (Protected)
```bash
curl -X GET http://localhost:3001/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# e2e tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📁 Project Structure

```
src/
├── auth/                    # Authentication module
│   ├── dto/                # Data Transfer Objects
│   ├── guards/             # Authentication guards
│   ├── strategies/         # Passport strategies
│   ├── decorators/         # Custom decorators
│   ├── auth.controller.ts  # Auth controller
│   ├── auth.service.ts     # Auth business logic
│   └── auth.module.ts      # Auth module
├── users/                  # Users module
│   ├── entities/           # User entity
│   └── users.module.ts     # Users module
├── config/                 # Configuration
│   └── configuration.ts    # App configuration
├── app.module.ts           # Root module
└── main.ts                 # Application entry point
```

## 🔒 Security Features

- **Password Hashing**: bcryptjs with configurable salt rounds
- **JWT Tokens**: Access and refresh token implementation
- **Rate Limiting**: Protection against brute force attacks
- **Input Validation**: Comprehensive request validation
- **CORS**: Configurable cross-origin resource sharing
- **Helmet**: Security headers middleware
- **Compression**: Response compression for performance

## 🚀 Deployment

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

EXPOSE 3001

CMD ["node", "dist/main"]
```

### Environment Variables

Make sure to set these environment variables in production:

- `NODE_ENV=production`
- `JWT_SECRET` (use a strong, unique secret)
- `JWT_REFRESH_SECRET` (use a different strong secret)
- Database credentials
- `CORS_ORIGIN` (your frontend domain)

## 📊 Monitoring

The service includes:
- Request logging
- Error tracking
- Performance monitoring
- Health checks

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Verification Authentication Model

Verification scripts require a short-lived access token.

**Token Management:**
- Tokens are obtained via `auth-login.sh` using a UAT user
- Scripts must be **sourced**, not executed: `source scripts/auth-login.sh` (not `bash scripts/auth-login.sh`)
- Tokens expire in 900 seconds (15 minutes)
- Each terminal run is a separate process - `TOKEN` must be in the current shell

**Workflow Scope:**
- This workflow is **for engineers only**
- Customers never interact with these scripts
- Normal customers use the web app which handles login and token refresh automatically

**For customer API access later:**
- Personal access tokens with scoped permissions and rotation
- OAuth2 for third-party apps
- Service accounts for automated systems

See `docs/STEP8_RUNBOOK.md` for detailed verification instructions.

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, please contact the development team or create an issue in the repository.
