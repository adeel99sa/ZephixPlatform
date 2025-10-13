#!/bin/bash

# Script to run migrations on Railway
# Usage: ./scripts/run-migrations.sh

set -e

echo "🚀 Running migrations on Railway..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable is not set"
    echo "Please set it with: export DATABASE_URL='your-railway-database-url'"
    exit 1
fi

# Run migrations
echo "📦 Running TypeORM migrations..."
npx typeorm migration:run -d src/config/data-source.ts

echo "✅ Migrations completed successfully!"
