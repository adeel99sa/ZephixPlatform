# 🚨 Railway Database Fix Guide

## **Problem**
Your Railway backend is failing to start with this error:
```
QueryFailedError: relation "roles" does not exist
```

This happens because the application tries to seed roles on startup, but the required database tables don't exist.

## **Root Cause**
The Railway database is missing several critical tables:
- `roles` - Required for role-based access control
- `teams` - Required for team management
- `team_members` - Required for team membership
- `brds` - Required for business requirements documents

## **Solution Options**

### **Option 1: Automated Fix (Recommended)**
Run the automated database fix script:

```bash
# Set your Railway DATABASE_URL
export DATABASE_URL="your-railway-postgresql-connection-string"

# Run the fix script
npm run db:fix-railway
```

### **Option 2: Manual Database Connection**
Connect directly to your Railway PostgreSQL database and run the SQL commands:

```bash
# Connect to Railway database
psql "your-railway-postgresql-connection-string"

# Create missing tables
CREATE TABLE IF NOT EXISTS "roles" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "name" character varying(100) NOT NULL,
  "description" text,
  "permissions" jsonb NOT NULL DEFAULT '{}',
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_roles" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "teams" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "name" character varying(255) NOT NULL,
  "description" text,
  "organizationId" uuid NOT NULL,
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_teams" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "team_members" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "teamId" uuid NOT NULL,
  "userId" uuid NOT NULL,
  "role" character varying(50) DEFAULT 'member',
  "isActive" boolean NOT NULL DEFAULT true,
  "joinedAt" TIMESTAMP DEFAULT now(),
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_team_members" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_team_members_team_user" UNIQUE ("teamId", "userId")
);

CREATE TABLE IF NOT EXISTS "brds" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "title" character varying(500) NOT NULL,
  "description" text,
  "content" jsonb NOT NULL DEFAULT '{}',
  "status" character varying(50) DEFAULT 'draft',
  "projectId" uuid,
  "organizationId" uuid NOT NULL,
  "createdBy" uuid NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_brds" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "teams" 
ADD CONSTRAINT "FK_teams_organization" 
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE;

ALTER TABLE "team_members" 
ADD CONSTRAINT "FK_team_members_team" 
FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE;

ALTER TABLE "team_members" 
ADD CONSTRAINT "FK_team_members_user" 
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "brds" 
ADD CONSTRAINT "FK_brds_project" 
FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL;

ALTER TABLE "brds" 
ADD CONSTRAINT "FK_brds_organization" 
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE;

ALTER TABLE "brds" 
ADD CONSTRAINT "FK_brds_created_by" 
FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE;

-- Insert default roles
INSERT INTO "roles" ("name", "description", "permissions", "isActive") 
VALUES 
  ('admin', 'Administrator with full access', '{"all": true}', true),
  ('pm', 'Project Manager with project management access', '{"projects": true, "teams": true}', true),
  ('member', 'Team member with basic access', '{"view": true}', true),
  ('viewer', 'Read-only access', '{"view": true}', true);
```

## **Step-by-Step Fix Process**

### **Step 1: Get Your Railway Database URL**
1. Go to your Railway project dashboard
2. Click on your PostgreSQL service
3. Go to the "Connect" tab
4. Copy the "PostgreSQL Connection URL"

### **Step 2: Run the Fix Script**
```bash
# Navigate to your backend directory
cd zephix-backend

# Set the DATABASE_URL environment variable
export DATABASE_URL="your-railway-postgresql-connection-string"

# Run the automated fix
npm run db:fix-railway
```

### **Step 3: Verify the Fix**
The script will show you:
- ✅ Tables created successfully
- ✅ Foreign key constraints added
- ✅ Default roles inserted
- 📊 Final table count and foreign key count

### **Step 4: Redeploy Your Railway Service**
1. Go to your Railway project dashboard
2. Click on your backend service
3. Click "Deploy" to trigger a new deployment
4. Monitor the logs to ensure successful startup

## **Expected Output**
When the fix script runs successfully, you should see:

```
🔧 Fixing Railway Database - Creating Missing Tables
==================================================
📡 Connecting to Railway database...
✅ Database connection established

📋 Existing tables:
  - email_verifications
  - invitations
  - migrations
  - organizations
  - projects
  - user_organizations
  - users

🔍 Checking and creating missing tables...
  ✅ roles: created successfully
  ✅ teams: created successfully
  ✅ team_members: created successfully
  ✅ brds: created successfully

🔗 Creating foreign key constraints...
  ✅ Teams -> Organizations FK created
  ✅ Team Members -> Teams FK created
  ✅ Team Members -> Users FK created
  ✅ BRDs -> Projects FK created
  ✅ BRDs -> Organizations FK created
  ✅ BRDs -> Users FK created

👥 Inserting default roles...
  ✅ Default roles inserted

🔍 Final verification...
  📋 Found 11 tables: brds, email_verifications, invitations, migrations, organizations, projects, roles, team_members, teams, user_organizations, users
  🔗 Found 13 foreign key constraints

🎉 Railway database fix completed successfully!
```

## **Troubleshooting**

### **"DATABASE_URL not set" Error**
```bash
# Make sure you've set the environment variable
echo $DATABASE_URL

# If empty, set it again
export DATABASE_URL="your-railway-postgresql-connection-string"
```

### **"Connection failed" Error**
- Verify your Railway PostgreSQL service is running
- Check that the connection URL is correct
- Ensure your IP is not blocked by Railway

### **"Permission denied" Error**
- The Railway database user needs CREATE TABLE permissions
- Contact Railway support if you don't have admin access

### **"Table already exists" Warnings**
- These are normal and can be ignored
- The script uses `CREATE TABLE IF NOT EXISTS`

## **After the Fix**

### **1. Monitor Railway Logs**
Watch for successful startup:
```
[Nest] LOG [Bootstrap] Application started successfully
[Nest] LOG [Bootstrap] Listening on port 3000
```

### **2. Test Health Endpoint**
Once running, test:
```
GET https://your-railway-app.railway.app/api/health
```

### **3. Verify API Endpoints**
Test basic endpoints:
- `GET /api/health` - Health check
- `POST /api/auth/signup` - User registration
- `GET /api/organizations` - Organizations list

## **Prevention**

### **1. Database Migrations**
In the future, use proper migrations:
```bash
# Generate migration
npm run db:migrate:generate

# Run migration
npm run db:migrate
```

### **2. Environment Variables**
Ensure all required environment variables are set in Railway:
- `DATABASE_URL`
- `JWT_SECRET`
- `NODE_ENV`

### **3. Health Checks**
The application now includes comprehensive health checks that will catch missing tables early.

## **Support**

If you continue to have issues:
1. Check Railway service logs for detailed error messages
2. Verify database connectivity
3. Ensure all required tables exist
4. Contact support with specific error messages

---

**🎯 Goal**: Get your Railway backend running with a complete database schema
**⏱️ Time**: 5-10 minutes
**🔄 Process**: Connect → Fix → Verify → Deploy → Test
