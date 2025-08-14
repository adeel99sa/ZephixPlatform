#!/bin/bash

# Zephix Railway Reference Error Fix Script
# This script fixes the "reference not found" error in Railway deployments

set -e

echo "🔧 Fixing Railway Reference Error..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -d "zephix-backend" ] || [ ! -d "zephix-frontend" ]; then
    print_error "This script must be run from the Zephix root directory"
    exit 1
fi

print_status "Current directory: $(pwd)"

# Step 1: Fix Node.js version consistency
print_status "Step 1: Fixing Node.js version consistency..."

# Update frontend .nvmrc to match backend
echo "20" > zephix-frontend/.nvmrc
print_status "Updated frontend .nvmrc to Node.js 20"

# Update root .nvmrc
echo "20" > .nvmrc
print_status "Updated root .nvmrc to Node.js 20"

# Step 2: Create proper Railway configurations
print_status "Step 2: Creating proper Railway configurations..."

# Create backend railway.json
cat > zephix-backend/railway.json << 'EOF'
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "nixpacks"
  },
  "deploy": {
    "startCommand": "npm run start:railway",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "on_failure",
    "restartPolicyMaxRetries": 3
  }
}
EOF

# Create frontend railway.json
cat > zephix-frontend/railway.json << 'EOF'
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "nixpacks"
  },
  "deploy": {
    "startCommand": "npm run start",
    "healthcheckPath": "/",
    "healthcheckTimeout": 300,
    "restartPolicyType": "on_failure",
    "restartPolicyMaxRetries": 3
  }
}
EOF

# Create backend nixpacks.toml
cat > zephix-backend/nixpacks.toml << 'EOF'
[phases.setup]
nixPkgs = ["nodejs_20", "yarn"]

[phases.install]
cmds = ["npm ci"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npm run start:railway"
EOF

# Create frontend nixpacks.toml
cat > zephix-frontend/nixpacks.toml << 'EOF'
[phases.setup]
nixPkgs = ["nodejs_20", "yarn"]

[phases.install]
cmds = ["npm ci"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npm run start"
EOF

print_status "Created Railway and Nixpacks configuration files"

# Step 3: Update package.json scripts if needed
print_status "Step 3: Checking package.json scripts..."

# Check backend package.json
if [ -f "zephix-backend/package.json" ]; then
    print_status "Backend package.json exists"
    if ! grep -q "start:railway" zephix-backend/package.json; then
        print_warning "Backend missing start:railway script, adding it..."
        # Add the script if it doesn't exist
        sed -i.bak '/"scripts": {/a\    "start:railway": "node dist/main.js",' zephix-backend/package.json
    fi
fi

# Check frontend package.json
if [ -f "zephix-frontend/package.json" ]; then
    print_status "Frontend package.json exists"
    if ! grep -q '"start"' zephix-frontend/package.json; then
        print_warning "Frontend missing start script, adding it..."
        # Add the script if it doesn't exist
        sed -i.bak '/"scripts": {/a\    "start": "serve -s dist -l ${PORT:-8080}",' zephix-frontend/package.json
    fi
fi

# Step 4: Create .railwayignore files
print_status "Step 4: Creating .railwayignore files..."

cat > zephix-backend/.railwayignore << 'EOF'
node_modules/
.git/
.env
*.log
coverage/
test/
tests/
*.test.ts
*.spec.ts
EOF

cat > zephix-frontend/.railwayignore << 'EOF'
node_modules/
.git/
.env
*.log
coverage/
test/
tests/
*.test.ts
*.spec.ts
storybook/
cypress/
EOF

print_status "Created .railwayignore files"

# Step 5: Verify file structure
print_status "Step 5: Verifying file structure..."

echo "Backend files:"
ls -la zephix-backend/ | grep -E "(railway\.json|nixpacks\.toml|package\.json|\.nvmrc)"

echo "Frontend files:"
ls -la zephix-frontend/ | grep -E "(railway\.json|nixpacks\.toml|package\.json|\.nvmrc)"

# Step 6: Create deployment verification script
print_status "Step 6: Creating deployment verification script..."

cat > verify-deployment.sh << 'EOF'
#!/bin/bash

echo "🔍 Verifying Railway deployment..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "npm install -g @railway/cli"
    exit 1
fi

# Check project status
echo "📊 Checking Railway project status..."
railway status

# Check service status
echo "🚀 Checking service status..."
railway service:list

echo "✅ Deployment verification complete!"
echo "Next steps:"
echo "1. Run: railway up (from respective service directories)"
echo "2. Check logs: railway logs"
echo "3. Monitor deployment: railway status"
EOF

chmod +x verify-deployment.sh

print_status "Created deployment verification script"

# Step 7: Summary
print_status "Step 7: Fix summary..."

echo ""
echo "🎯 Railway Reference Error Fix Complete!"
echo ""
echo "✅ Fixed Node.js version consistency (20.x)"
echo "✅ Created Railway configuration files"
echo "✅ Created Nixpacks configuration files"
echo "✅ Added .railwayignore files"
echo "✅ Created deployment verification script"
echo ""
echo "🚀 Next steps:"
echo "1. Commit these changes: git add . && git commit -m 'Fix Railway reference error'"
echo "2. Push to GitHub: git push origin main"
echo "3. Run deployment verification: ./verify-deployment.sh"
echo "4. Deploy services: cd zephix-backend && railway up"
echo "5. Deploy frontend: cd zephix-frontend && railway up"
echo ""
echo "📚 For more help, see: DEPLOYMENT_GUIDE.md"

print_status "Fix script completed successfully!"
