#!/bin/bash

# EMERGENCY STARTUP SCRIPT
# This script starts the Zephix backend without database connection
# Use this for emergency recovery when database is down

echo "🚨 EMERGENCY MODE: Starting Zephix Backend without database"
echo "⚠️  This will disable authentication and data persistence features"
echo ""

# Set emergency environment variables
export SKIP_DATABASE=true
export EMERGENCY_MODE=true
export NODE_ENV=production
export PORT=3000

# Disable OpenTelemetry to reduce startup complexity
export OTEL_ENABLED=false

# Set basic JWT secret for emergency mode
export JWT_SECRET=emergency-jwt-secret-key-2025

echo "🔧 Environment variables set:"
echo "   SKIP_DATABASE: $SKIP_DATABASE"
echo "   EMERGENCY_MODE: $EMERGENCY_MODE"
echo "   NODE_ENV: $NODE_ENV"
echo "   PORT: $PORT"
echo "   OTEL_ENABLED: $OTEL_ENABLED"
echo ""

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "❌ Build directory not found. Building application..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "❌ Build failed. Cannot start in emergency mode."
        exit 1
    fi
fi

echo "✅ Build directory found. Starting application..."
echo ""

# Start the application
npm run start:railway

echo ""
echo "🚨 Emergency mode completed."
echo "💡 To restore full functionality:"
echo "   1. Fix database connection issues"
echo "   2. Set SKIP_DATABASE=false"
echo "   3. Restart the application"
