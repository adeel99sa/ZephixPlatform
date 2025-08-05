#!/bin/bash

# Railway Deployment Test Script
# This script simulates and validates the Railway deployment process

echo "🧪 Railway Deployment Test"
echo "=========================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    if [ "$1" = "INFO" ]; then
        echo -e "${BLUE}ℹ️  $2${NC}"
    elif [ "$1" = "SUCCESS" ]; then
        echo -e "${GREEN}✅ $2${NC}"
    elif [ "$1" = "WARNING" ]; then
        echo -e "${YELLOW}⚠️  $2${NC}"
    elif [ "$1" = "ERROR" ]; then
        echo -e "${RED}❌ $2${NC}"
    fi
}

# Test 1: Validate all configuration files
validate_configuration() {
    print_status "INFO" "Step 1: Validating configuration files..."
    
    # Check root railway.toml
    if [ -f "../../ZephixApp/railway.toml" ]; then
        if grep -q 'builder = "NIXPACKS"' "../../ZephixApp/railway.toml"; then
            print_status "SUCCESS" "Root railway.toml has NIXPACKS builder"
        else
            print_status "ERROR" "Root railway.toml missing NIXPACKS builder"
            return 1
        fi
    else
        print_status "ERROR" "Root railway.toml not found"
        return 1
    fi
    
    # Check nixpacks.toml
    if [ -f "nixpacks.toml" ]; then
        if grep -q 'providers = \["node"\]' "nixpacks.toml" && grep -q 'NODE_VERSION = "20.19.0"' "nixpacks.toml"; then
            print_status "SUCCESS" "nixpacks.toml correctly configured"
        else
            print_status "ERROR" "nixpacks.toml incorrectly configured"
            return 1
        fi
    else
        print_status "ERROR" "nixpacks.toml not found"
        return 1
    fi
    
    # Check railway.json
    if [ -f "railway.json" ]; then
        if grep -q '"builder": "NIXPACKS"' "railway.json"; then
            print_status "SUCCESS" "railway.json correctly configured"
        else
            print_status "ERROR" "railway.json incorrectly configured"
            return 1
        fi
    else
        print_status "ERROR" "railway.json not found"
        return 1
    fi
    
    # Check package.json
    if [ -f "package.json" ]; then
        if grep -q '"build":' "package.json" && grep -q '"preview":' "package.json"; then
            print_status "SUCCESS" "package.json scripts correctly configured"
        else
            print_status "ERROR" "package.json scripts incorrectly configured"
            return 1
        fi
    else
        print_status "ERROR" "package.json not found"
        return 1
    fi
}

# Test 2: Check for Docker files
check_docker_files() {
    print_status "INFO" "Step 2: Checking for Docker files..."
    
    docker_files=$(find . -name "Dockerfile*" -o -name "docker-compose*" -o -name ".dockerignore" 2>/dev/null)
    
    if [ -z "$docker_files" ]; then
        print_status "SUCCESS" "No Docker files found"
    else
        print_status "ERROR" "Docker files found that may cause Railway to use Docker:"
        echo "$docker_files"
        return 1
    fi
}

# Test 3: Validate Node.js version consistency
validate_node_version() {
    print_status "INFO" "Step 3: Validating Node.js version consistency..."
    
    if [ -f ".nvmrc" ]; then
        nvmrc_version=$(cat .nvmrc | tr -d ' ')
        nixpacks_version=$(grep "NODE_VERSION" nixpacks.toml | cut -d'"' -f2)
        
        if [ "$nvmrc_version" = "$nixpacks_version" ]; then
            print_status "SUCCESS" "Node.js versions match: $nvmrc_version"
        else
            print_status "ERROR" "Node.js versions don't match: .nvmrc=$nvmrc_version, nixpacks.toml=$nixpacks_version"
            return 1
        fi
    else
        print_status "WARNING" ".nvmrc not found"
    fi
}

# Test 4: Simulate build process
simulate_build_process() {
    print_status "INFO" "Step 4: Simulating build process..."
    
    echo "📋 Expected Railway NIXPACKS build flow:"
    echo "   1. Railway detects global NIXPACKS builder from railway.toml"
    echo "   2. Railway uses nixpacks.toml configuration"
    echo "   3. Installs Node.js 20.19.0 via nixPkgs"
    echo "   4. Runs: npm ci --only=production"
    echo "   5. Runs: npm run build"
    echo "   6. Runs: npm run preview"
    echo "   7. Starts Vite preview server on PORT"
    
    print_status "SUCCESS" "Build process simulation completed"
}

# Test 5: Check for potential issues
check_potential_issues() {
    print_status "INFO" "Step 5: Checking for potential deployment issues..."
    
    # Check for hidden files
    hidden_files=$(find . -name ".*" -type f | grep -i docker 2>/dev/null || true)
    if [ -z "$hidden_files" ]; then
        print_status "SUCCESS" "No hidden Docker-related files found"
    else
        print_status "WARNING" "Hidden Docker-related files found:"
        echo "$hidden_files"
    fi
    
    # Check for environment variables
    if [ -f ".env" ] || [ -f ".env.local" ]; then
        print_status "WARNING" "Environment files found - ensure they don't interfere with Railway"
    else
        print_status "SUCCESS" "No conflicting environment files found"
    fi
    
    # Check for build artifacts
    if [ -d "dist" ] || [ -d "build" ]; then
        print_status "WARNING" "Build artifacts found - these will be ignored by Railway"
    else
        print_status "SUCCESS" "No build artifacts found"
    fi
}

# Test 6: Validate deployment readiness
validate_deployment_readiness() {
    print_status "INFO" "Step 6: Validating deployment readiness..."
    
    # Check if all required files are present
    required_files=("railway.json" "nixpacks.toml" "package.json" ".railwayignore")
    missing_files=()
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            missing_files+=("$file")
        fi
    done
    
    if [ ${#missing_files[@]} -eq 0 ]; then
        print_status "SUCCESS" "All required files present"
    else
        print_status "ERROR" "Missing required files: ${missing_files[*]}"
        return 1
    fi
    
    # Check if scripts are executable
    if [ -x "scripts/enhanced-verification.sh" ]; then
        print_status "SUCCESS" "Verification scripts are executable"
    else
        print_status "WARNING" "Verification scripts are not executable"
    fi
}

# Main execution
main() {
    echo "🚀 Railway Deployment Test Process"
    echo "=================================="
    
    # Run all tests
    if ! validate_configuration; then
        print_status "ERROR" "Configuration validation failed"
        exit 1
    fi
    
    if ! check_docker_files; then
        print_status "ERROR" "Docker files check failed"
        exit 1
    fi
    
    if ! validate_node_version; then
        print_status "ERROR" "Node.js version validation failed"
        exit 1
    fi
    
    simulate_build_process
    
    check_potential_issues
    
    if ! validate_deployment_readiness; then
        print_status "ERROR" "Deployment readiness validation failed"
        exit 1
    fi
    
    echo ""
    print_status "SUCCESS" "All deployment tests passed!"
    echo ""
    echo "🎯 Deployment Summary:"
    echo "   - Configuration files: ✅ Valid"
    echo "   - Docker files: ✅ None found"
    echo "   - Node.js version: ✅ Consistent"
    echo "   - Build process: ✅ Simulated"
    echo "   - Deployment readiness: ✅ Ready"
    echo ""
    echo "📝 Next Steps:"
    echo "   1. Commit all changes: git add . && git commit -m 'Force NIXPACKS builder usage'"
    echo "   2. Push to repository: git push origin main"
    echo "   3. Monitor Railway deployment logs"
    echo "   4. Verify NIXPACKS builder is used (not Docker)"
    echo "   5. Test application URLs"
    echo ""
    echo "🔍 Success Indicators:"
    echo "   - Railway logs show 'NIXPACKS' instead of 'Docker'"
    echo "   - No Docker stages in build logs"
    echo "   - Successful npm install and build"
    echo "   - React app accessible at Railway URLs"
    echo ""
    echo "🔄 If Docker builds persist:"
    echo "   - Run: ./scripts/railway-service-recreation.sh"
    echo "   - This will recreate the Railway service with correct configuration"
}

# Run main function
main "$@" 