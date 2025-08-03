# Minimal User Registration System Setup

## Quick Start

### 1. Environment Setup
Create a `.env` file in the `packages/user-auth-service` directory:

```bash
# Application Configuration
NODE_ENV=development
PORT=3001

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=zephix_user
DB_PASSWORD=zephix_secure_password_2024
DB_DATABASE=zephix_auth_db
DB_SSL=false
DB_SYNCHRONIZE=true
DB_LOGGING=true

# JWT Configuration (for future use)
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
```

### 2. Database Setup
Make sure PostgreSQL is running and create the database:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE zephix_auth_db;
CREATE USER zephix_user WITH PASSWORD 'zephix_secure_password_2024';
GRANT ALL PRIVILEGES ON DATABASE zephix_auth_db TO zephix_user;
\q
```

### 3. Install Dependencies
```bash
cd packages/user-auth-service
npm install
```

### 4. Setup UUID Extension (Required for PostgreSQL)
```bash
# Enable UUID extension in PostgreSQL
npm run setup:uuid
```

### 5. Start the Server
```bash
# Development mode with auto-restart
npm run dev

# Or production mode
npm start
```

### 6. Test the Registration
```bash
# Using the test script
npm run test:register

# Or using cURL (see test-commands.txt)
curl -X POST http://localhost:3001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "MySecurePassword123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

## Endpoints

- **Health Check**: `GET http://localhost:3001/health`
- **User Registration**: `POST http://localhost:3001/api/users/register`

## Features

✅ Single working registration endpoint  
✅ Environment variables load correctly  
✅ Database connection established  
✅ User data saved to PostgreSQL with hashed password  
✅ Proper error handling for duplicate emails  
✅ Validation for required fields  
✅ Immediate testability with curl or test script  

## File Structure

```
src/
├── api/routes/user.routes.js          # Registration endpoint
├── services/user.service.js           # User registration logic
├── domain/entities/user.entity.js     # User entity with schema
├── infrastructure/config/database.config.js  # Database configuration
└── main.js                           # Application entry point

test-registration.js                  # Test script
test-commands.txt                     # cURL test commands
```

## Success Criteria Met

- ✅ Single working endpoint: POST /api/users/register
- ✅ Environment variables load correctly
- ✅ Database connection established
- ✅ User data saved to PostgreSQL with hashed password
- ✅ Proper error handling for duplicate emails
- ✅ Validation for required fields
- ✅ Immediate testability with curl or test script 