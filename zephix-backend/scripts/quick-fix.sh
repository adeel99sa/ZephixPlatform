#!/bin/bash

# Quick Fix Script - Automated Database Migration Fix
# This script will fix your database issues automatically

set -e

echo "🚀 Zephix Database Quick Fix Script"
echo "=================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is not set"
    echo "Please set it and run this script again"
    exit 1
fi

echo "🔍 Current database status:"
echo "Database URL: $DATABASE_URL"
echo ""

# Step 1: Check if we can connect to the database
echo "📡 Testing database connection..."
if psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
    echo "✅ Database connection successful"
else
    echo "❌ Cannot connect to database. Please check your DATABASE_URL"
    exit 1
fi

# Step 2: Ask user for approach
echo ""
echo "Choose your fix approach:"
echo "1) Clean Slate (DESTROYS ALL DATA) - Fastest fix"
echo "2) Data Preservation (Keeps existing data) - Slower but safer"
echo ""
read -p "Enter your choice (1 or 2): " choice

case $choice in
    1)
        echo ""
        echo "🚨 WARNING: Clean Slate approach will destroy all data!"
        read -p "Type 'YES' to confirm: " confirmation
        if [ "$confirmation" != "YES" ]; then
            echo "❌ Operation cancelled"
            exit 1
        fi
        
        echo ""
        echo "🗑️  Resetting database (clean slate)..."
        npm run db:reset
        
        echo ""
        echo "🔧 Repairing database schema..."
        npm run db:repair
        
        echo ""
        echo "📦 Building application..."
        npm run build
        
        echo ""
        echo "🔄 Running migrations..."
        npm run db:migrate
        
        ;;
    2)
        echo ""
        echo "🔍 Checking current database state..."
        npm run db:verify
        
        echo ""
        echo "🔧 Repairing database issues..."
        npm run db:repair
        
        echo ""
        echo "📦 Building application..."
        npm run build
        
        echo ""
        echo "🔄 Running migrations..."
        npm run db:migrate
        
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again and choose 1 or 2."
        exit 1
        ;;
esac

# Step 3: Verify the fix
echo ""
echo "🔍 Verifying database fix..."
npm run db:verify

echo ""
echo "🔒 Running safety check..."
npm run db:safety-check

echo ""
echo "🏥 Testing health endpoint..."
npm run health:check

echo ""
echo "🎉 Database fix completed successfully!"
echo ""
echo "Next steps:"
echo "1. Start your application: npm run start:dev"
echo "2. Test the API endpoints"
echo "3. Monitor the health endpoint: /api/health"
echo ""
echo "If you encounter any issues, run: npm run db:repair"
