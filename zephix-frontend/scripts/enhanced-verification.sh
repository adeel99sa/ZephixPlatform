#!/bin/bash

# Enhanced Railway NIXPACKS Verification Script
# This script performs comprehensive checks to ensure Railway uses NIXPACKS only

echo "🔍 Enhanced Railway NIXPACKS Verification"
echo "========================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    if [ "$1" = "PASS" ]; then
        echo -e "${GREEN}✅ $2${NC}"
    elif [ "$1" = "FAIL" ]; then
        echo -e "${RED}❌ $2${NC}"
    elif [ "$1" = "WARN" ]; then
        echo -e "${YELLOW}⚠️  $2${NC}"
    fi
}

# Test 1: Check for Docker files in entire repository
echo "1. Scanning for Docker files..."
docker_files=$(find . -name "Dockerfile*" -o -name "docker-compose*" -o -name ".dockerignore" 2>/dev/null)

if [ -z "$docker_files" ]; then
    print_status "PASS" "No Docker files found in repository"
else
    print_status "FAIL" "Docker files found that may cause Railway to use Docker:"
    echo "$docker_files"
    exit 1
fi

# Test 2: Verify root railway.toml has global NIXPACKS configuration
echo ""
echo "2. Checking root railway.toml configuration..."
if grep -q "\[build\]" ../../ZephixApp/railway.toml && grep -q 'builder = "NIXPACKS"' ../../ZephixApp/railway.toml; then
    print_status "PASS" "Root railway.toml has global NIXPACKS builder configuration"
else
    print_status "FAIL" "Root railway.toml missing global NIXPACKS builder configuration"
    exit 1
fi

# Test 3: Verify frontend service configuration
if grep -q 'build = { builder = "NIXPACKS" }' ../../ZephixApp/railway.toml; then
    print_status "PASS" "Frontend service has explicit NIXPACKS builder configuration"
else
    print_status "FAIL" "Frontend service missing explicit NIXPACKS builder configuration"
    exit 1
fi

# Test 4: Verify nixpacks.toml configuration
echo ""
echo "3. Validating nixpacks.toml configuration..."
if [ -f "nixpacks.toml" ]; then
    print_status "PASS" "nixpacks.toml exists"
    
    # Check providers array syntax
    if grep -q 'providers = \["node"\]' nixpacks.toml; then
        print_status "PASS" "Providers array syntax is correct"
    else
        print_status "FAIL" "Providers array syntax is incorrect"
        exit 1
    fi
    
    # Check Node.js version
    if grep -q 'NODE_VERSION = "20.19.0"' nixpacks.toml; then
        print_status "PASS" "Node.js version 20.19.0 specified"
    else
        print_status "FAIL" "Node.js version 20.19.0 not specified"
        exit 1
    fi
    
    # Check build phases
    if grep -q '\[phases.build\]' nixpacks.toml && grep -q 'cmds = \["npm ci --omit=dev", "npm run build"\]' nixpacks.toml; then
        print_status "PASS" "Build phase correctly configured"
    else
        print_status "FAIL" "Build phase incorrectly configured"
        exit 1
    fi
    
    # Check start phase
    if grep -q '\[phases.start\]' nixpacks.toml && grep -q 'cmd = "npm run preview -- --host 0.0.0.0 --port \$PORT"' nixpacks.toml; then
        print_status "PASS" "Start phase correctly configured"
    else
        print_status "FAIL" "Start phase incorrectly configured"
        exit 1
    fi
else
    print_status "FAIL" "nixpacks.toml not found"
    exit 1
fi

# Test 5: Verify package.json scripts
echo ""
echo "4. Validating package.json scripts..."
if [ -f "package.json" ]; then
    print_status "PASS" "package.json exists"
    
    # Check for required scripts
    required_scripts=("build" "preview" "start")
    for script in "${required_scripts[@]}"; do
        if grep -q "\"$script\":" package.json; then
            print_status "PASS" "Script '$script' found in package.json"
        else
            print_status "FAIL" "Script '$script' missing from package.json"
            exit 1
        fi
    done
    
    # Check script contents
    if grep -q '"build": "vite build"' package.json; then
        print_status "PASS" "Build script correctly configured"
    else
        print_status "FAIL" "Build script incorrectly configured"
        exit 1
    fi
    
    if grep -q '"preview": "vite preview --host 0.0.0.0 --port \$PORT"' package.json; then
        print_status "PASS" "Preview script correctly configured"
    else
        print_status "FAIL" "Preview script incorrectly configured"
        exit 1
    fi
else
    print_status "FAIL" "package.json not found"
    exit 1
fi

# Test 6: Verify .railwayignore configuration
echo ""
echo "5. Checking .railwayignore configuration..."
if [ -f ".railwayignore" ]; then
    print_status "PASS" ".railwayignore exists"
    
    if grep -q "Dockerfile" .railwayignore; then
        print_status "PASS" "Dockerfile exclusion configured"
    else
        print_status "FAIL" "Dockerfile exclusion not configured"
        exit 1
    fi
    
    if grep -q "docker-compose.yml" .railwayignore; then
        print_status "PASS" "docker-compose.yml exclusion configured"
    else
        print_status "FAIL" "docker-compose.yml exclusion not configured"
        exit 1
    fi
else
    print_status "FAIL" ".railwayignore not found"
    exit 1
fi

# Test 7: Verify Node.js version consistency
echo ""
echo "6. Checking Node.js version consistency..."
if [ -f ".nvmrc" ]; then
    nvmrc_version=$(cat .nvmrc | tr -d ' ')
    nixpacks_version=$(grep "NODE_VERSION" nixpacks.toml | cut -d'"' -f2)
    
    if [ "$nvmrc_version" = "$nixpacks_version" ]; then
        print_status "PASS" "Node.js versions match: $nvmrc_version"
    else
        print_status "FAIL" "Node.js versions don't match: .nvmrc=$nvmrc_version, nixpacks.toml=$nixpacks_version"
        exit 1
    fi
else
    print_status "WARN" ".nvmrc not found"
fi

# Test 8: Verify railway.json configuration
echo ""
echo "7. Checking railway.json configuration..."
if [ -f "railway.json" ]; then
    print_status "PASS" "railway.json exists"
    
    if grep -q '"builder": "NIXPACKS"' railway.json; then
        print_status "PASS" "NIXPACKS builder specified in railway.json"
    else
        print_status "FAIL" "NIXPACKS builder not specified in railway.json"
        exit 1
    fi
    
    if grep -q '"nixpacksConfigPath": "./nixpacks.toml"' railway.json; then
        print_status "PASS" "NIXPACKS config path specified"
    else
        print_status "FAIL" "NIXPACKS config path not specified"
        exit 1
    fi
else
    print_status "FAIL" "railway.json not found"
    exit 1
fi

# Test 9: Check for any hidden Docker-related files
echo ""
echo "8. Checking for hidden Docker-related files..."
hidden_docker_files=$(find . -name ".*" -type f | grep -i docker 2>/dev/null || true)

if [ -z "$hidden_docker_files" ]; then
    print_status "PASS" "No hidden Docker-related files found"
else
    print_status "FAIL" "Hidden Docker-related files found:"
    echo "$hidden_docker_files"
    exit 1
fi

# Test 10: Verify build process simulation
echo ""
echo "9. Simulating expected build process..."
echo "📋 Expected Railway NIXPACKS build flow:"
echo "   1. Railway detects global NIXPACKS builder from railway.toml"
echo "   2. Railway uses nixpacks.toml configuration"
echo "   3. Installs Node.js 20.19.0 via nixPkgs"
echo "   4. Runs: npm ci --only=production"
echo "   5. Runs: npm run build"
echo "   6. Runs: npm run preview"
echo "   7. Starts Vite preview server on PORT"

echo ""
print_status "PASS" "All verification tests passed!"
echo ""
echo "🚀 Configuration is ready for Railway deployment"
echo ""
echo "📝 Deployment Instructions:"
echo "   1. Commit changes: git add . && git commit -m 'Force NIXPACKS builder usage'"
echo "   2. Push to repository: git push origin main"
echo "   3. Monitor Railway logs for NIXPACKS usage (not Docker)"
echo "   4. Verify successful build and deployment"
echo ""
echo "🔍 Success Indicators:"
echo "   - Railway logs show 'NIXPACKS' instead of 'Docker'"
echo "   - No Docker stages in build logs"
echo "   - Successful npm install and build"
echo "   - React app accessible at Railway URLs" 