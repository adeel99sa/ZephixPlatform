#!/bin/bash
# Railway deployment script with migrations

echo "Starting deployment process..."

# Run database migrations
echo "Running database migrations..."
npm run db:migrate

# Start the application
echo "Starting application..."
npm run start:prod
