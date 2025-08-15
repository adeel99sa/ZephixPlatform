#!/bin/bash

# Database Reset Script - Clean Slate Approach
# WARNING: This will destroy all data in the database

set -e

echo "🚨 WARNING: This will destroy all data in the database"
echo "Database URL: $DATABASE_URL"
echo ""
read -p "Are you sure you want to continue? Type 'YES' to confirm: " confirmation

if [ "$confirmation" != "YES" ]; then
    echo "❌ Operation cancelled"
    exit 1
fi

echo "🗑️  Dropping public schema..."
psql "$DATABASE_URL" -c 'DROP SCHEMA IF EXISTS public CASCADE;'

echo "🆕 Creating fresh public schema..."
psql "$DATABASE_URL" -c 'CREATE SCHEMA public;'

echo "🔐 Setting permissions..."
psql "$DATABASE_URL" -c 'GRANT ALL ON SCHEMA public TO postgres;'
psql "$DATABASE_URL" -c 'GRANT ALL ON SCHEMA public TO public;'

echo "📦 Installing required extensions..."
psql "$DATABASE_URL" -c 'CREATE EXTENSION IF NOT EXISTS "pgcrypto";'
psql "$DATABASE_URL" -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'

echo "🧹 Removing migrations table if exists..."
psql "$DATABASE_URL" -c 'DROP TABLE IF EXISTS "migrations";'

echo "✅ Database reset complete!"
echo ""
echo "Next steps:"
echo "1. Run migrations: npm run db:migrate"
echo "2. Verify tables: npm run db:verify"
echo "3. Start application: npm run start:dev"
