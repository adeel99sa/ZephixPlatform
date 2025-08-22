#!/bin/bash

echo "🔍 Validating deployment readiness..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo -e "${RED}❌ .env.production not found${NC}"
    exit 1
fi

# Check required environment variables
REQUIRED_VARS=(
    "DATABASE_URL"
    "JWT_SECRET"
    "SENDGRID_API_KEY"
    "SENDGRID_FROM_EMAIL"
)

echo "Checking required environment variables..."
for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^${var}=" .env.production; then
        echo -e "${YELLOW}⚠️  Warning: ${var} not set in .env.production${NC}"
    else
        echo -e "${GREEN}✓ ${var} configured${NC}"
    fi
done

# Test TypeScript compilation
echo "Testing TypeScript compilation..."
npx tsc --noEmit
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ TypeScript compilation failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ TypeScript compilation successful${NC}"

# Test production build
echo "Testing production build..."
NODE_ENV=production npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Production build failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Production build successful${NC}"

# Check if dist folder was created
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ dist folder not created${NC}"
    exit 1
fi
echo -e "${GREEN}✓ dist folder created${NC}"

# Count compiled files
FILE_COUNT=$(find dist -name "*.js" | wc -l)
echo -e "${GREEN}✓ Compiled ${FILE_COUNT} JavaScript files${NC}"

# Test Docker build
echo "Testing Docker build..."
docker build -t zephix-backend-test .
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Docker build failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker build successful${NC}"

echo -e "${GREEN}🎉 Deployment validation successful!${NC}"
echo ""
echo "Next steps:"
echo "1. Set environment variables in Railway/deployment platform"
echo "2. Push to deployment branch"
echo "3. Monitor deployment logs"
