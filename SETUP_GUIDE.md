# Zephix NestJS Authentication Service - Setup Guide

## 🎯 Overview

This guide will help you set up and run the enterprise-grade NestJS authentication service with all features working properly.

## 📋 Prerequisites

### Required Software
- **Node.js**: v18 or higher
- **PostgreSQL**: v12 or higher
- **npm**: v9 or higher

### System Requirements
- **RAM**: Minimum 2GB, Recommended 4GB
- **Storage**: 1GB free space
- **Network**: Internet access for package installation

## 🚀 Quick Setup

### Step 1: Verify Prerequisites

```bash
# Check Node.js version
node --version  # Should be v18+

# Check npm version
npm --version   # Should be v9+

# Check PostgreSQL
psql --version  # Should be v12+
```

### Step 2: Database Setup

```bash
# Connect to PostgreSQL as superuser
psql -U postgres

# Create database and user
CREATE DATABASE zephix_auth_db;
CREATE USER zephix_user WITH PASSWORD 'zephix_secure_password_2024';
GRANT ALL PRIVILEGES ON DATABASE zephix_auth_db TO zephix_user;
\q
```

### Step 3: Environment Configuration

The `.env` file is already created with the following configuration:

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

### Step 4: Install Dependencies

```bash
# Install all dependencies
npm install
```

### Step 5: Start the Application

```bash
# Development mode with hot reload
npm run start:dev

# Or production mode
npm run build
npm run start:prod
```

## 🧪 Testing the Setup

### 1. Health Check

```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 2. API Documentation

Visit: http://localhost:3001/api/docs

You should see the Swagger UI with all authentication endpoints documented.

### 3. User Registration Test

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

Expected response:
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User",
    "isActive": true,
    "emailVerified": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token"
}
```

### 4. User Login Test

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!"
  }'
```

### 5. Profile Access Test

```bash
# Use the accessToken from the login response
curl -X GET http://localhost:3001/api/auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 🔧 Configuration Options

### Database Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | localhost | PostgreSQL host |
| `DB_PORT` | 5432 | PostgreSQL port |
| `DB_USERNAME` | zephix_user | Database username |
| `DB_PASSWORD` | zephix_secure_password_2024 | Database password |
| `DB_DATABASE` | zephix_auth_db | Database name |
| `DB_LOGGING` | false | Enable SQL logging |

### JWT Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | - | JWT signing secret |
| `JWT_REFRESH_SECRET` | - | Refresh token secret |
| `JWT_EXPIRES_IN` | 15m | Access token expiry |
| `JWT_REFRESH_EXPIRES_IN` | 7d | Refresh token expiry |

### Security Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `BCRYPT_ROUNDS` | 12 | Password hashing rounds |
| `THROTTLE_TTL` | 60 | Rate limit window (seconds) |
| `THROTTLE_LIMIT` | 10 | Rate limit requests per window |

## 🚨 Troubleshooting

### Common Issues

#### 1. Database Connection Error

**Error**: `Connection to database failed`

**Solution**:
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL if not running
sudo systemctl start postgresql

# Verify database exists
psql -U zephix_user -d zephix_auth_db -c "\dt"
```

#### 2. Port Already in Use

**Error**: `EADDRINUSE: address already in use :::3001`

**Solution**:
```bash
# Find process using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>

# Or change port in .env
PORT=3002
```

#### 3. JWT Secret Not Set

**Error**: `JWT_SECRET environment variable is required`

**Solution**:
```bash
# Add JWT secret to .env
echo "JWT_SECRET=your-super-secret-jwt-key-2024" >> .env
```

#### 4. TypeORM Synchronization Error

**Error**: `relation "users" does not exist`

**Solution**:
```bash
# Enable database logging to debug
DB_LOGGING=true

# Check if synchronize is enabled
# In .env: NODE_ENV=development
```

### Performance Issues

#### 1. Slow Database Queries

```bash
# Enable query logging
DB_LOGGING=true

# Check database indexes
psql -U zephix_user -d zephix_auth_db -c "\d+ users"
```

#### 2. Memory Usage

```bash
# Monitor Node.js memory usage
node --max-old-space-size=2048 dist/main.js
```

## 🔒 Security Checklist

- [ ] JWT secrets are strong and unique
- [ ] Database password is secure
- [ ] CORS origin is properly configured
- [ ] Rate limiting is enabled
- [ ] Input validation is working
- [ ] Password hashing is using bcrypt
- [ ] HTTPS is enabled in production
- [ ] Environment variables are secure

## 📊 Monitoring

### Health Check Endpoint

```bash
curl http://localhost:3001/api/health
```

### Application Logs

```bash
# View application logs
npm run start:dev 2>&1 | tee app.log

# Monitor real-time logs
tail -f app.log
```

### Database Monitoring

```bash
# Check database connections
psql -U zephix_user -d zephix_auth_db -c "SELECT * FROM pg_stat_activity;"

# Check table statistics
psql -U zephix_user -d zephix_auth_db -c "SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del FROM pg_stat_user_tables;"
```

## 🚀 Production Deployment

### 1. Environment Setup

```bash
# Set production environment
NODE_ENV=production

# Use strong JWT secrets
JWT_SECRET=your-production-jwt-secret-2024
JWT_REFRESH_SECRET=your-production-refresh-secret-2024

# Configure CORS for your domain
CORS_ORIGIN=https://yourdomain.com
```

### 2. Database Security

```bash
# Create production database user with limited privileges
CREATE USER zephix_prod WITH PASSWORD 'strong_production_password';
GRANT CONNECT ON DATABASE zephix_auth_db TO zephix_prod;
GRANT USAGE ON SCHEMA public TO zephix_prod;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO zephix_prod;
```

### 3. Process Management

```bash
# Use PM2 for process management
npm install -g pm2
pm2 start dist/main.js --name "zephix-auth"

# Enable PM2 startup
pm2 startup
pm2 save
```

## ✅ Success Criteria

Your setup is successful when:

- [ ] Application starts without errors
- [ ] Database connection is established
- [ ] Health check endpoint responds
- [ ] Swagger documentation is accessible
- [ ] User registration works
- [ ] User login works
- [ ] JWT authentication works
- [ ] Rate limiting is functional
- [ ] Input validation is working
- [ ] All tests pass

## 🎉 Next Steps

1. **Customize Configuration**: Update environment variables for your needs
2. **Add Features**: Implement additional authentication features
3. **Scale**: Set up load balancing and clustering
4. **Monitor**: Implement comprehensive monitoring and alerting
5. **Security**: Conduct security audit and penetration testing

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review application logs
3. Verify database connectivity
4. Test with the provided curl commands
5. Create an issue in the repository

The service is now ready for production use! 🚀 