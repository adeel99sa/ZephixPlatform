#!/bin/bash

# Simple Database Setup for Zephix
# This script works with regular PostgreSQL access

set -e

echo "🚀 Setting up Zephix database (simple mode)..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Database configuration
DB_NAME="zephix_development"
DB_USER="zephix_user"
DB_PASSWORD="zephix_dev_password_$(date +%s)"

echo -e "${BLUE}📋 Database Configuration:${NC}"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo "   Password: $DB_PASSWORD"

# Try to create database (might fail if we don't have CREATE privileges)
echo -e "${BLUE}🗄️  Creating database...${NC}"
if psql -d postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null; then
    echo -e "${GREEN}✅ Database $DB_NAME created${NC}"
else
    echo -e "${YELLOW}⚠️  Could not create database $DB_NAME${NC}"
    echo "   This might be because:"
    echo "   - Database already exists"
    echo "   - You don't have CREATE DATABASE privileges"
    echo "   - Another user owns the database"
fi

# Try to create user (might fail if we don't have CREATE USER privileges)
echo -e "${BLUE}👤 Creating user...${NC}"
if psql -d postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null; then
    echo -e "${GREEN}✅ User $DB_USER created${NC}"
else
    echo -e "${YELLOW}⚠️  Could not create user $DB_USER${NC}"
    echo "   This might be because:"
    echo "   - User already exists"
    echo "   - You don't have CREATE USER privileges"
fi

# Try to grant privileges
echo -e "${BLUE}🔐 Granting privileges...${NC}"
if psql -d "$DB_NAME" -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null; then
    echo -e "${GREEN}✅ Database privileges granted${NC}"
else
    echo -e "${YELLOW}⚠️  Could not grant database privileges${NC}"
fi

if psql -d "$DB_NAME" -c "GRANT ALL PRIVILEGES ON SCHEMA public TO $DB_USER;" 2>/dev/null; then
    echo -e "${GREEN}✅ Schema privileges granted${NC}"
else
    echo -e "${YELLOW}⚠️  Could not grant schema privileges${NC}"
fi

# Test connection
echo -e "${BLUE}🧪 Testing database connection...${NC}"
if psql "postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
else
    echo -e "${YELLOW}⚠️  Database connection failed${NC}"
    echo "   This might be because:"
    echo "   - User or database doesn't exist"
    echo "   - Privileges not properly set"
    echo "   - Password authentication failed"
fi

# Update .env file
echo -e "${BLUE}📝 Updating .env file...${NC}"
if [ -f ".env" ]; then
    # Update existing .env file
    sed -i.bak "s/DB_USERNAME=.*/DB_USERNAME=$DB_USER/" .env
    sed -i.bak "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" .env
    sed -i.bak "s/DB_NAME=.*/DB_NAME=$DB_NAME/" .env
    echo -e "${GREEN}✅ .env file updated${NC}"
else
    echo -e "${YELLOW}⚠️  .env file not found${NC}"
    echo "   Please create .env file with these values:"
    echo "   DB_USERNAME=$DB_USER"
    echo "   DB_PASSWORD=$DB_PASSWORD"
    echo "   DB_NAME=$DB_NAME"
fi

echo ""
echo -e "${GREEN}🎉 Database setup attempt complete!${NC}"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo "1. If setup failed, run manually with superuser access:"
echo "   sudo -u postgres psql"
echo "   CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
echo "   CREATE DATABASE $DB_NAME OWNER $DB_USER;"
echo "   GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
echo ""
echo "2. Test the application:"
echo "   npm run start:dev"
echo ""
echo -e "${YELLOW}💡 If you get permission errors, you may need superuser access${NC}"
