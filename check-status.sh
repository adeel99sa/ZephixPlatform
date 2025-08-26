#!/bin/bash

# Zephix Development Environment Status Check
# This script checks the status of all development services

set -e

echo "🔍 Checking Zephix Development Environment Status..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check service status
check_service() {
    local name=$1
    local url=$2
    local description=$3
    
    echo -n "Checking $name... "
    
    if curl -s "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ RUNNING${NC}"
        echo "   📍 URL: $url"
        echo "   📝 $description"
    else
        echo -e "${RED}❌ NOT RUNNING${NC}"
        echo "   📍 URL: $url"
        echo "   📝 $description"
    fi
    echo ""
}

# Function to check port status
check_port() {
    local name=$1
    local port=$2
    local description=$3
    
    echo -n "Checking $name... "
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${GREEN}✅ RUNNING${NC}"
        echo "   📍 Port: $port"
        echo "   📝 $description"
    else
        echo -e "${RED}❌ NOT RUNNING${NC}"
        echo "   📍 Port: $port"
        echo "   📝 $description"
    fi
    echo ""
}

# Function to check Docker containers
check_docker_container() {
    local name=$1
    local description=$2
    
    echo -n "Checking Docker container $name... "
    
    if docker ps --format "table {{.Names}}" | grep -q "^$name$"; then
        local status=$(docker ps --format "table {{.Names}}\t{{.Status}}" | grep "^$name" | awk '{print $2}')
        echo -e "${GREEN}✅ RUNNING${NC}"
        echo "   📍 Status: $status"
        echo "   📝 $description"
    else
        echo -e "${RED}❌ NOT RUNNING${NC}"
        echo "   📝 $description"
    fi
    echo ""
}

echo -e "${BLUE}🌐 Web Services Status${NC}"
echo "========================"

check_service "Frontend" "http://localhost:5173" "React application with hot reload"
check_service "Backend API" "http://localhost:3000" "NestJS REST API"
check_service "API Documentation" "http://localhost:3000/api" "Swagger/OpenAPI documentation"
check_service "VS Code Web" "http://localhost:8080" "Full IDE in browser"
check_service "Main Proxy" "http://localhost" "Nginx reverse proxy"

echo -e "${BLUE}🐳 Docker Containers Status${NC}"
echo "================================"

check_docker_container "zephix-postgres-dev" "PostgreSQL database"
check_docker_container "zephix-redis-dev" "Redis cache"
check_docker_container "zephix-backend-dev" "NestJS backend service"
check_docker_container "zephix-frontend-dev" "React frontend service"
check_docker_container "zephix-code-server" "VS Code Server"
check_docker_container "zephix-nginx" "Nginx reverse proxy"

echo -e "${BLUE}🔌 Port Status${NC}"
echo "================"

check_port "PostgreSQL" "5432" "Database connection"
check_port "Redis" "6379" "Cache connection"
check_port "Backend" "3000" "API service"
check_port "Frontend" "5173" "Web application"
check_port "VS Code Server" "8080" "Web IDE"
check_port "Nginx" "80" "Reverse proxy"

echo -e "${BLUE}🗄️ Database Health${NC}"
echo "=================="

# Check PostgreSQL health
if docker ps --format "table {{.Names}}" | grep -q "^zephix-postgres-dev$"; then
    echo -n "Checking PostgreSQL health... "
    if docker exec zephix-postgres-dev pg_isready -U postgres > /dev/null 2>&1; then
        echo -e "${GREEN}✅ HEALTHY${NC}"
        echo "   📍 Database: zephix_dev"
        echo "   📝 Connection: OK"
    else
        echo -e "${RED}❌ UNHEALTHY${NC}"
        echo "   📝 Connection: Failed"
    fi
else
    echo -e "${YELLOW}⚠️  PostgreSQL container not running${NC}"
fi
echo ""

# Check Redis health
if docker ps --format "table {{.Names}}" | grep -q "^zephix-redis-dev$"; then
    echo -n "Checking Redis health... "
    if docker exec zephix-redis-dev redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✅ HEALTHY${NC}"
        echo "   📍 Port: 6379"
        echo "   📝 Connection: OK"
    else
        echo -e "${RED}❌ UNHEALTHY${NC}"
        echo "   📝 Connection: Failed"
    fi
else
    echo -e "${YELLOW}⚠️  Redis container not running${NC}"
fi
echo ""

echo -e "${BLUE}📊 Summary${NC}"
echo "=========="

# Count running services
web_services=0
docker_containers=0
ports=0

# Count web services
for url in "http://localhost:5173" "http://localhost:3000" "http://localhost:3000/api" "http://localhost:8080" "http://localhost"; do
    if curl -s "$url" > /dev/null 2>&1; then
        ((web_services++))
    fi
done

# Count Docker containers
docker_containers=$(docker ps --format "table {{.Names}}" | grep -c "zephix-" || echo "0")

# Count active ports
for port in 5432 6379 3000 5173 8080 80; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        ((ports++))
    fi
done

echo "🌐 Web Services: $web_services/5 running"
echo "🐳 Docker Containers: $docker_containers/6 running"
echo "🔌 Active Ports: $ports/6 active"

echo ""
echo -e "${BLUE}🚀 Quick Actions${NC}"
echo "================"
echo "Start all services:    ./start-docker.sh"
echo "Stop all services:     docker-compose -f docker-compose.dev.yml down"
echo "View logs:             docker-compose -f docker-compose.dev.yml logs -f"
echo "Restart services:      docker-compose -f docker-compose.dev.yml restart"
echo "Check specific logs:   docker-compose -f docker-compose.dev.yml logs -f [service-name]"

echo ""
echo -e "${BLUE}📱 Access URLs${NC}"
echo "================"
echo "Frontend:              http://localhost:5173"
echo "Backend API:           http://localhost:3000"
echo "API Docs:              http://localhost:3000/api"
echo "VS Code Web:           http://localhost:8080 (password: zephix123)"
echo "Main Proxy:            http://localhost"

echo ""
if [ $web_services -eq 5 ] && [ $docker_containers -eq 6 ] && [ $ports -eq 6 ]; then
    echo -e "${GREEN}🎉 All services are running successfully!${NC}"
else
    echo -e "${YELLOW}⚠️  Some services are not running. Check the status above.${NC}"
fi