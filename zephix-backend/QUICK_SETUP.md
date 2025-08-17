# Zephix Quick Setup Guide

## 🚀 **Essential Setup (5 minutes)**

### 1. **Copy Environment File**
```bash
cp env.example .env
# Edit .env with your database credentials
```

### 2. **Set Up Local Database**

**Option A: Automated Setup (Unix/macOS)**
```bash
# If you have PostgreSQL superuser access
./scripts/setup-local-database.sh
```

**Option B: Manual Setup (All Platforms)**
```sql
-- Connect as superuser (postgres)
psql -U postgres

-- Create user and database
CREATE USER zephix_user WITH PASSWORD 'your_password';
CREATE DATABASE zephix_development OWNER zephix_user;
GRANT ALL PRIVILEGES ON DATABASE zephix_development TO zephix_user;
\c zephix_development
GRANT ALL PRIVILEGES ON SCHEMA public TO zephix_user;
\q
```

**Option C: GUI Tool (pgAdmin, etc.)**
- Create user `zephix_user` with password
- Create database `zephix_development` owned by `zephix_user`
- Grant all privileges on database and schema

### 3. **Configure Environment Variables**
```bash
# In your .env file
DB_HOST=localhost
DB_PORT=5432
DB_NAME=zephix_development
DB_USERNAME=zephix_user
DB_PASSWORD=your_password
```

### 4. **Test the Setup**
```bash
npm run start:dev
```

## 🔧 **What Each Script Does**

- **`setup-local-database.sh`** - Unix/macOS automated setup (requires superuser)
- **`setup-local-database.ps1`** - Windows PowerShell instructions
- **Both are optional** - manual setup works on all platforms

## 🚨 **Troubleshooting**

**Database Connection Failed?**
```bash
# Check if PostgreSQL is running
pg_isready  # Unix/macOS
# or check Services on Windows

# Test connection manually
psql "postgresql://zephix_user:password@localhost:5432/zephix_development"
```

**Permission Denied?**
- Use manual setup (Option B above)
- Ensure `zephix_user` has CREATE, ALTER, DROP privileges

**Environment Variables Not Working?**
- Check `.env` file exists in project root
- Verify variable names match exactly (DB_HOST, not DATABASE_HOST)

## 📋 **Minimal .env File**
```bash
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=zephix_development
DB_USERNAME=zephix_user
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key
```

## 🎯 **That's It!**

Once your database is connected, the application will:
- Auto-load all entities
- Handle CORS properly (including X-Timestamp header)
- Use the right configuration for your environment

No complex scripts or multiple config files needed for basic development.

## 🔒 **Safety Notes**

- **Never commit .env files** - They contain sensitive credentials
- **Check existing resources** - Scripts will ask before overwriting
- **Production is automatic** - Railway sets all required variables
- **Local development only** - Use .env for local database credentials
