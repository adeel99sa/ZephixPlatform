#!/bin/bash

# Database Configuration Fix Script
# This script sets the missing database environment variables that the application needs

echo "🔧 Fixing Database Configuration Variables..."

# Extract values from DATABASE_URL
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:IzCgTGNmVDQHunqICLyu@postgres.railway.internal:5432/railway?sslmode=require}"

# Parse DATABASE_URL to extract individual components
if [[ $DATABASE_URL =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/([^?]+) ]]; then
    DB_USERNAME="${BASH_REMATCH[1]}"
    DB_PASSWORD="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_DATABASE="${BASH_REMATCH[5]}"
    
    echo "✅ Parsed DATABASE_URL:"
    echo "   Username: $DB_USERNAME"
    echo "   Host: $DB_HOST"
    echo "   Port: $DB_PORT"
    echo "   Database: $DB_DATABASE"
    echo "   Password: [HIDDEN]"
    
    # Set these as environment variables for the current session
    export DB_USERNAME="$DB_USERNAME"
    export DB_PASSWORD="$DB_PASSWORD"
    export DB_HOST="$DB_HOST"
    export DB_PORT="$DB_PORT"
    export DB_DATABASE="$DB_DATABASE"
    
    echo ""
    echo "🔧 Environment variables set for current session"
    echo "   To make permanent, add these to your Railway environment:"
    echo ""
    echo "   DB_USERNAME=$DB_USERNAME"
    echo "   DB_PASSWORD=$DB_PASSWORD"
    echo "   DB_HOST=$DB_HOST"
    echo "   DB_PORT=$DB_PORT"
    echo "   DB_DATABASE=$DB_DATABASE"
    echo ""
    echo "🚀 Next: Restart your Railway service to pick up these variables"
    
else
    echo "❌ Failed to parse DATABASE_URL: $DATABASE_URL"
    echo "   Expected format: postgresql://username:password@host:port/database"
    exit 1
fi
