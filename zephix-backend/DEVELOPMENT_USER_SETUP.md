# Development User Setup

## Overview
This document explains how to create a development user with a strong password that meets the authentication service complexity requirements.

## Problem
The authentication service has built-in password complexity checks that prevent weak passwords from being used, even in development. This can make testing difficult if you don't have a strong password.

## Solution
We've created a seed script that automatically creates a development user with a strong password that meets all complexity requirements.

## Development User Credentials

**Email:** `demo@zephix.com`  
**Password:** `Knight3967#!@`

### Password Complexity Breakdown
- ✅ **Uppercase letters:** K, N
- ✅ **Lowercase letters:** night, ight, ight
- ✅ **Numbers:** 3, 9, 6, 7
- ✅ **Special characters:** #, !, @
- ✅ **Length:** 12 characters (exceeds minimum requirement)

## How to Create the Development User

### Option 1: Using npm script (Recommended)
```bash
# From the zephix-backend directory
npm run seed:dev-user
```

### Option 2: Direct execution
```bash
# From the zephix-backend directory
npx ts-node -r tsconfig-paths/register scripts/seed-development-user.ts
```

### Option 3: Manual execution
```bash
# From the zephix-backend directory
ts-node -r tsconfig-paths/register scripts/seed-development-user.ts
```

## What the Script Does

1. **Connects to database** using `DATABASE_URL` environment variable
2. **Checks if user exists** to avoid duplicates
3. **Hashes the password** using bcrypt with 12 salt rounds
4. **Creates the user** with all required fields
5. **Provides feedback** on success or failure

## Prerequisites

- ✅ `DATABASE_URL` environment variable set
- ✅ Database connection available
- ✅ `users` table exists (run migrations first)
- ✅ `bcryptjs` package installed

## Environment Variables Required

```bash
# Required for database connection
DATABASE_URL=postgresql://username:password@host:port/database

# Optional - for logging
NODE_ENV=development
```

## Troubleshooting

### Error: "DATABASE_URL not set"
- Ensure your `.env` file contains `DATABASE_URL`
- Check that the environment variable is loaded

### Error: "Database connection failed"
- Verify your database is running
- Check `DATABASE_URL` format and credentials
- Ensure database exists and is accessible

### Error: "Users table does not exist"
- Run database migrations first: `npm run migration:run:dev`
- Check if migrations completed successfully

### Error: "User already exists"
- The script will show existing user details
- Delete the user first if you want to recreate with new password
- Or modify the script to update existing user

## Security Notes

⚠️ **IMPORTANT:** This password is for development only!

- **Never use in production**
- **Never commit to version control**
- **Change immediately after first login in production**
- **Use only for local development and testing**

## Testing the Login

After creating the user, you can test the login:

```bash
# Test with curl
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@zephix.com",
    "password": "Knight3967#!@"
  }'

# Or test through your frontend application
```

## Script Output Example

```
🌱 Seeding Development User with Strong Password

📋 Environment Check:
   DATABASE_URL: Set
   NODE_ENV: Not set

🔌 Connecting to database...
✅ Database connection successful

👤 Development User Details:
   Email: demo@zephix.com
   Password: Knight3967#!@
   Name: Demo User
   Role: user

🔍 Checking if user already exists...
🔐 Hashing password...
✅ Password hashed successfully
📝 Creating development user...
✅ Development user created successfully!

🎉 User Details:
   ID: 123e4567-e89b-12d3-a456-426614174000
   Email: demo@zephix.com
   Password: Knight3967#!@ (plain text for development)
   Name: Demo User
   Role: user
   Active: true
   Email Verified: true
   Created: 2024-08-16T22:45:00.000Z

🔑 Login Credentials:
   Email: demo@zephix.com
   Password: Knight3967#!@

✅ Development user seeded successfully!
🔌 Database connection closed
🏁 Seed script completed
```

## Next Steps

1. ✅ Run the seed script: `npm run seed:dev-user`
2. ✅ Verify user creation in database
3. ✅ Test login with frontend application
4. ✅ Use these credentials for development and testing

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify environment variables are set correctly
3. Ensure database is accessible and migrations are run
4. Check the script output for specific error messages
