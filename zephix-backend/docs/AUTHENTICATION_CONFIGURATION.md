# Authentication Configuration Guide for Zephix Backend

## Overview

This document describes the complete authentication system for the Zephix Backend, including JWT configuration, user management, and security considerations.

## System Architecture

### Components
- **AuthModule**: Main authentication module
- **AuthService**: Core authentication logic
- **AuthController**: REST API endpoints
- **JWT Strategy**: JWT token validation
- **Local Strategy**: Username/password validation
- **User Entity**: Database user model
- **RefreshToken Entity**: Token refresh mechanism

### Authentication Flow
1. User submits credentials (signup/login)
2. Credentials validated against database
3. JWT access token generated
4. Refresh token created and stored
5. Tokens returned to client
6. Client uses access token for protected requests
7. Token refresh when access token expires

## Configuration

### Environment Variables

#### Required Variables
```bash
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database

# CORS Configuration
FRONTEND_URL=https://zephix-frontend-production.up.railway.app
CORS_ALLOWED_ORIGINS=https://zephix-frontend-production.up.railway.app,https://getzephix.com
CORS_CREDENTIALS=true
```

#### Optional Variables
```bash
# JWT Token Expiry (defaults)
JWT_EXPIRES_IN=15m          # Access token expiry
JWT_REFRESH_EXPIRES_IN=7d   # Refresh token expiry

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=60           # Requests per minute
AUTH_RATE_LIMIT_MAX=5       # Auth attempts per 15 minutes
```

### Configuration File Structure
```typescript
// src/config/configuration.ts
export default () => ({
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  // ... other configurations
});
```

## API Endpoints

### Authentication Endpoints

#### POST /api/auth/signup
**Purpose**: Create new user account
**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "organizationName": "Acme Corp"
}
```
**Response** (201):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user"
  },
  "token": "jwt-access-token",
  "refreshToken": "uuid-refresh-token",
  "expiresIn": 900
}
```

#### POST /api/auth/login
**Purpose**: Authenticate existing user
**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```
**Response** (200):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user"
  },
  "token": "jwt-access-token",
  "refreshToken": "uuid-refresh-token",
  "expiresIn": 900
}
```

#### GET /api/auth/me
**Purpose**: Get current user profile
**Headers**: `Authorization: Bearer <jwt-token>`
**Response** (200):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### POST /api/auth/refresh
**Purpose**: Refresh access token
**Request Body**:
```json
{
  "refreshToken": "uuid-refresh-token"
}
```
**Response** (200):
```json
{
  "token": "new-jwt-access-token",
  "refreshToken": "new-uuid-refresh-token",
  "expiresIn": 900
}
```

#### POST /api/auth/logout
**Purpose**: Logout user and revoke tokens
**Headers**: `Authorization: Bearer <jwt-token>`
**Response** (200):
```json
{
  "message": "Logout successful"
}
```

## Security Features

### Password Security
- **Hashing**: bcrypt with salt rounds (10)
- **Validation**: Minimum 8 characters, uppercase, lowercase, number/special character
- **Storage**: Hashed passwords only, never plaintext

### JWT Security
- **Secret**: Environment variable (never hardcoded)
- **Expiry**: Configurable (default: 15 minutes for access, 7 days for refresh)
- **Algorithm**: HS256 (HMAC SHA256)
- **Payload**: User ID, email, role only

### Rate Limiting
- **General**: 60 requests per minute per IP
- **Authentication**: 5 attempts per 15 minutes per IP
- **Health Checks**: Excluded from rate limiting

### CORS Security
- **Origins**: Whitelist only (no wildcards)
- **Credentials**: Enabled for authentication
- **Methods**: GET, POST, PUT, DELETE, OPTIONS, PATCH
- **Headers**: Authorization, Content-Type, etc.

## Database Schema

### User Entity
```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ default: 'user' })
  role: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isEmailVerified: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### RefreshToken Entity
```typescript
@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  token: string;

  @ManyToOne(() => User)
  user: User;

  @Column()
  expiresAt: Date;

  @Column({ default: false })
  isRevoked: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
```

## Testing

### Local Testing
```bash
# Test authentication flow
npm run test:auth

# Test with specific backend URL
BACKEND_URL=http://localhost:3000 npm run test:auth
```

### Production Testing
```bash
# Test production authentication
BACKEND_URL=https://zephix-backend-production.up.railway.app npm run test:auth
```

### Manual Testing
```bash
# Test signup
curl -X POST \
  -H "Origin: https://zephix-frontend-production.up.railway.app" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePassword123!","firstName":"Test","lastName":"User"}' \
  https://zephix-backend-production.up.railway.app/api/auth/signup

# Test login
curl -X POST \
  -H "Origin: https://zephix-frontend-production.up.railway.app" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePassword123!"}' \
  https://zephix-backend-production.up.railway.app/api/auth/login
```

## Troubleshooting

### Common Issues

#### 1. JWT_SECRET Not Configured
**Problem**: `JWT_SECRET is not configured` error
**Solution**: Set `JWT_SECRET` environment variable

#### 2. Invalid Credentials (401)
**Problem**: Login returns 401
**Solution**: Check user exists, password is correct, user is active

#### 3. CORS Errors
**Problem**: Frontend can't connect due to CORS
**Solution**: Verify CORS configuration and frontend URL in allowed origins

#### 4. Token Expired (401)
**Problem**: Valid token returns 401
**Solution**: Token has expired, use refresh token to get new access token

#### 5. Database Connection Issues
**Problem**: Authentication endpoints fail with database errors
**Solution**: Check database connection and migrations

### Debug Steps

1. **Check Environment Variables**
   ```bash
   echo $JWT_SECRET
   echo $DATABASE_URL
   echo $FRONTEND_URL
   ```

2. **Verify Database Connection**
   ```bash
   npm run db:status
   ```

3. **Check Application Logs**
   - Look for authentication errors
   - Verify JWT configuration
   - Check database queries

4. **Test Authentication Flow**
   ```bash
   npm run test:auth
   ```

5. **Verify CORS Configuration**
   ```bash
   npm run test:cors
   ```

## Deployment Checklist

- [ ] JWT_SECRET environment variable set
- [ ] DATABASE_URL configured for production
- [ ] CORS origins include frontend URL
- [ ] Database migrations run successfully
- [ ] Authentication endpoints accessible
- [ ] JWT tokens generated correctly
- [ ] Protected endpoints working
- [ ] Rate limiting configured
- [ ] Security headers enabled

## Security Best Practices

### Production Security
- Use strong, unique JWT secrets
- Enable HTTPS only
- Implement proper rate limiting
- Monitor authentication attempts
- Regular security audits

### Token Management
- Short-lived access tokens (15 minutes)
- Secure refresh token storage
- Token revocation on logout
- Monitor token usage

### Password Security
- Strong password requirements
- Secure password reset flow
- Account lockout after failed attempts
- Regular password policy updates

## Support

For authentication-related issues:
1. Check this documentation
2. Run authentication tests: `npm run test:auth`
3. Verify environment variables
4. Check database connectivity
5. Review application logs
6. Test with curl commands
