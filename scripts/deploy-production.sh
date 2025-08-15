#!/bin/bash

echo "🚀 Deploying Project Zephix to Production..."

# Verify configuration first
./scripts/verify-production-deployment.sh
if [ $? -ne 0 ]; then
    echo "❌ Deployment verification failed"
    exit 1
fi

echo "📦 Deploying backend service..."
cd zephix-backend
railway up --detach
cd ..

echo "🌐 Deploying frontend service..."
cd zephix-frontend
railway up --detach
cd ..

echo "✅ Deployment initiated! Check Railway dashboard for status."
