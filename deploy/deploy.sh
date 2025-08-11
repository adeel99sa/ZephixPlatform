#!/bin/bash

# BRD System Production Deployment Script
# Usage: ./deploy.sh [environment]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RELEASE_VERSION="${GITHUB_SHA:-$TIMESTAMP}"

echo -e "${GREEN}🚀 Starting BRD System Deployment${NC}"
echo -e "Environment: ${YELLOW}$ENVIRONMENT${NC}"
echo -e "Release Version: ${YELLOW}$RELEASE_VERSION${NC}"

# Pre-deployment checks
echo -e "\n${YELLOW}Running pre-deployment checks...${NC}"

# Check required environment variables
required_vars=(
    "AWS_REGION"
    "AWS_ACCESS_KEY_ID"
    "AWS_SECRET_ACCESS_KEY"
    "ECR_REPOSITORY"
    "ECS_CLUSTER"
    "ECS_SERVICE"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}Error: $var is not set${NC}"
        exit 1
    fi
done

# Build and push Docker images
echo -e "\n${YELLOW}Building Docker images...${NC}"

# Backend
echo -e "Building backend image..."
docker build -t brd-backend:$RELEASE_VERSION ./backend
docker tag brd-backend:$RELEASE_VERSION $ECR_REPOSITORY/brd-backend:$RELEASE_VERSION
docker tag brd-backend:$RELEASE_VERSION $ECR_REPOSITORY/brd-backend:latest

# Frontend
echo -e "Building frontend image..."
docker build \
    --build-arg REACT_APP_API_URL=$REACT_APP_API_URL \
    --build-arg REACT_APP_WS_URL=$REACT_APP_WS_URL \
    -t brd-frontend:$RELEASE_VERSION ./frontend
docker tag brd-frontend:$RELEASE_VERSION $ECR_REPOSITORY/brd-frontend:$RELEASE_VERSION
docker tag brd-frontend:$RELEASE_VERSION $ECR_REPOSITORY/brd-frontend:latest

# Push to ECR
echo -e "\n${YELLOW}Pushing images to ECR...${NC}"
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPOSITORY

docker push $ECR_REPOSITORY/brd-backend:$RELEASE_VERSION
docker push $ECR_REPOSITORY/brd-backend:latest
docker push $ECR_REPOSITORY/brd-frontend:$RELEASE_VERSION
docker push $ECR_REPOSITORY/brd-frontend:latest

# Update ECS task definitions
echo -e "\n${YELLOW}Updating ECS task definitions...${NC}"

# Backend task definition
BACKEND_TASK_DEF=$(aws ecs describe-task-definition --task-definition brd-backend --query 'taskDefinition' --output json)
NEW_BACKEND_TASK_DEF=$(echo $BACKEND_TASK_DEF | jq --arg IMAGE "$ECR_REPOSITORY/brd-backend:$RELEASE_VERSION" '.containerDefinitions[0].image = $IMAGE | del(.taskDefinitionArn) | del(.revision) | del(.status) | del(.requiresAttributes) | del(.compatibilities) | del(.registeredAt) | del(.registeredBy)')
NEW_BACKEND_TASK_INFO=$(aws ecs register-task-definition --cli-input-json "$NEW_BACKEND_TASK_DEF")
NEW_BACKEND_REVISION=$(echo $NEW_BACKEND_TASK_INFO | jq -r '.taskDefinition.revision')

# Frontend task definition
FRONTEND_TASK_DEF=$(aws ecs describe-task-definition --task-definition brd-frontend --query 'taskDefinition' --output json)
NEW_FRONTEND_TASK_DEF=$(echo $FRONTEND_TASK_DEF | jq --arg IMAGE "$ECR_REPOSITORY/brd-frontend:$RELEASE_VERSION" '.containerDefinitions[0].image = $IMAGE | del(.taskDefinitionArn) | del(.revision) | del(.status) | del(.requiresAttributes) | del(.compatibilities) | del(.registeredAt) | del(.registeredBy)')
NEW_FRONTEND_TASK_INFO=$(aws ecs register-task-definition --cli-input-json "$NEW_FRONTEND_TASK_DEF")
NEW_FRONTEND_REVISION=$(echo $NEW_FRONTEND_TASK_INFO | jq -r '.taskDefinition.revision')

# Run database migrations
echo -e "\n${YELLOW}Running database migrations...${NC}"
aws ecs run-task \
    --cluster $ECS_CLUSTER \
    --task-definition brd-migrate:latest \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[$PRIVATE_SUBNETS],securityGroups=[$SECURITY_GROUP]}" \
    --overrides "{\"containerOverrides\":[{\"name\":\"migrate\",\"environment\":[{\"name\":\"RELEASE_VERSION\",\"value\":\"$RELEASE_VERSION\"}]}]}"

# Wait for migration to complete
echo -e "Waiting for migrations to complete..."
sleep 30

# Update ECS services
echo -e "\n${YELLOW}Updating ECS services...${NC}"

# Update backend service
aws ecs update-service \
    --cluster $ECS_CLUSTER \
    --service brd-backend \
    --task-definition brd-backend:$NEW_BACKEND_REVISION \
    --force-new-deployment

# Update frontend service
aws ecs update-service \
    --cluster $ECS_CLUSTER \
    --service brd-frontend \
    --task-definition brd-frontend:$NEW_FRONTEND_REVISION \
    --force-new-deployment

# Wait for services to stabilize
echo -e "\n${YELLOW}Waiting for services to stabilize...${NC}"
aws ecs wait services-stable \
    --cluster $ECS_CLUSTER \
    --services brd-backend brd-frontend

# Invalidate CloudFront cache
echo -e "\n${YELLOW}Invalidating CloudFront cache...${NC}"
aws cloudfront create-invalidation \
    --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
    --paths "/*"

# Health checks
echo -e "\n${YELLOW}Running health checks...${NC}"

# Backend health check
BACKEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" https://api.brd.yourdomain.com/health)
if [ $BACKEND_HEALTH -eq 200 ]; then
    echo -e "${GREEN}✓ Backend health check passed${NC}"
else
    echo -e "${RED}✗ Backend health check failed (HTTP $BACKEND_HEALTH)${NC}"
    exit 1
fi

# Frontend health check
FRONTEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" https://brd.yourdomain.com)
if [ $FRONTEND_HEALTH -eq 200 ]; then
    echo -e "${GREEN}✓ Frontend health check passed${NC}"
else
    echo -e "${RED}✗ Frontend health check failed (HTTP $FRONTEND_HEALTH)${NC}"
    exit 1
fi

# Create deployment tag
echo -e "\n${YELLOW}Creating deployment tag...${NC}"
git tag -a "deploy-$ENVIRONMENT-$TIMESTAMP" -m "Deployment to $ENVIRONMENT at $TIMESTAMP"
git push origin "deploy-$ENVIRONMENT-$TIMESTAMP"

# Send deployment notification
echo -e "\n${YELLOW}Sending deployment notification...${NC}"
curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"🚀 BRD System deployed to $ENVIRONMENT\nVersion: $RELEASE_VERSION\nStatus: SUCCESS\"}" \
    $SLACK_WEBHOOK_URL

echo -e "\n${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "Release Version: ${YELLOW}$RELEASE_VERSION${NC}"
echo -e "Environment: ${YELLOW}$ENVIRONMENT${NC}"

# Deployment summary
echo -e "\n${GREEN}Deployment Summary:${NC}"
echo -e "- Backend Task Definition: brd-backend:$NEW_BACKEND_REVISION"
echo -e "- Frontend Task Definition: brd-frontend:$NEW_FRONTEND_REVISION"
echo -e "- CloudFront Invalidation: Created"
echo -e "- Health Checks: Passed"
echo -e "- Deployment Tag: deploy-$ENVIRONMENT-$TIMESTAMP"