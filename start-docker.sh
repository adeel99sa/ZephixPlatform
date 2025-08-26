#!/bin/bash

# Zephix Docker Development Environment Startup Script
# This script starts all services using Docker Compose for web-based development

set -e

echo "🐳 Starting Zephix Docker Development Environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available. Please install Docker Compose first."
    exit 1
fi

# Function to check if port is available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  Port $port is already in use. Stopping conflicting service..."
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
}

# Check and free up ports
echo "🔍 Checking port availability..."
check_port 80
check_port 3000
check_port 5173
check_port 5432
check_port 6379
check_port 8080

# Create .env file for Docker Compose if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file for Docker Compose..."
    cat > .env << EOF
# Zephix Development Environment
COMPOSE_PROJECT_NAME=zephix-dev
NODE_ENV=development

# Database
POSTGRES_DB=zephix_dev
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password

# Backend
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h

# Frontend
VITE_API_BASE_URL=http://localhost:3000
VITE_APP_NAME=Zephix
VITE_APP_VERSION=1.0.0

# VS Code Server
VSCODE_PASSWORD=zephix123
EOF
    echo "✅ .env file created"
fi

# Build and start services
echo "🚀 Building and starting services..."
if command -v docker-compose &> /dev/null; then
    docker-compose -f docker-compose.dev.yml up --build -d
else
    docker compose -f docker-compose.dev.yml up --build -d
fi

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🔍 Checking service health..."

# Check PostgreSQL
if docker exec zephix-postgres-dev pg_isready -U postgres > /dev/null 2>&1; then
    echo "✅ PostgreSQL is ready"
else
    echo "❌ PostgreSQL is not ready"
fi

# Check Redis
if docker exec zephix-redis-dev redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is ready"
else
    echo "❌ Redis is not ready"
fi

# Check Backend
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Backend is ready"
else
    echo "⏳ Backend is starting..."
    sleep 10
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo "✅ Backend is ready"
    else
        echo "❌ Backend is not responding"
    fi
fi

# Check Frontend
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "✅ Frontend is ready"
else
    echo "⏳ Frontend is starting..."
    sleep 10
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo "✅ Frontend is ready"
    else
        echo "❌ Frontend is not responding"
    fi
fi

# Check VS Code Server
if curl -s http://localhost:8080 > /dev/null 2>&1; then
    echo "✅ VS Code Server is ready"
else
    echo "⏳ VS Code Server is starting..."
    sleep 10
    if curl -s http://localhost:8080 > /dev/null 2>&1; then
        echo "✅ VS Code Server is ready"
    else
        echo "❌ VS Code Server is not responding"
    fi
fi

echo ""
echo "🎉 Zephix Docker Development Environment Started!"
echo ""
echo "🌐 Access Points:"
echo "   📱 Frontend:        http://localhost:5173"
echo "   🔧 Backend API:     http://localhost:3000"
echo "   📚 API Docs:        http://localhost:3000/api"
echo "   💻 VS Code Web:     http://localhost:8080 (password: zephix123)"
echo "   🌍 Main Proxy:      http://localhost"
echo "   🗄️  Database:       localhost:5432"
echo "   🔴 Redis:           localhost:6379"
echo ""
echo "📋 Useful Commands:"
echo "   View logs:          docker-compose -f docker-compose.dev.yml logs -f"
echo "   Stop services:      docker-compose -f docker-compose.dev.yml down"
echo "   Restart services:   docker-compose -f docker-compose.dev.yml restart"
echo "   View containers:    docker ps"
echo ""
echo "🔍 Monitor services:"
echo "   docker-compose -f docker-compose.dev.yml logs -f [service-name]"
echo "   Example: docker-compose -f docker-compose.dev.yml logs -f backend"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping Zephix Development Environment..."
    if command -v docker-compose &> /dev/null; then
        docker-compose -f docker-compose.dev.yml down
    else
        docker compose -f docker-compose.dev.yml down
    fi
    echo "✅ Services stopped"
    exit 0
}

# Set trap for cleanup
trap cleanup INT

# Keep script running and show logs
echo "📊 Showing logs (press Ctrl+C to stop)..."
if command -v docker-compose &> /dev/null; then
    docker-compose -f docker-compose.dev.yml logs -f
else
    docker compose -f docker-compose.dev.yml logs -f
fi