#!/bin/bash
# Zephix Authentication Diagnostics Package Generator
# 
# This script runs comprehensive authentication diagnostics and creates
# a single archive with all diagnostic information for troubleshooting.
#
# Usage: ./scripts/run-auth-diagnostics.sh

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT_DIR="auth-diagnostics-$(date -u +%Y%m%dT%H%M%SZ)"
BACKEND_URL="${BACKEND_URL:-http://localhost:3000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "${BLUE}🔧 $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."
    
    # Check if we're in the right directory
    if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
        log_error "This script must be run from the zephix-backend directory"
        exit 1
    fi
    
    # Check if Node.js is available
    if ! command -v node &> /dev/null; then
        log_error "Node.js is required but not installed"
        exit 1
    fi
    
    # Check if npm is available
    if ! command -v npm &> /dev/null; then
        log_error "npm is required but not installed"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Create output directory
setup_output_directory() {
    log_step "Setting up output directory..."
    
    mkdir -p "$OUTPUT_DIR"
    mkdir -p "$OUTPUT_DIR/backend"
    mkdir -p "$OUTPUT_DIR/frontend"
    mkdir -p "$OUTPUT_DIR/environment"
    mkdir -p "$OUTPUT_DIR/logs"
    mkdir -p "$OUTPUT_DIR/network"
    
    log_success "Output directory created: $OUTPUT_DIR"
}

# Capture environment information
capture_environment() {
    log_step "Capturing environment information..."
    
    # System information
    {
        echo "=== SYSTEM INFORMATION ==="
        echo "Date: $(date -u)"
        echo "Hostname: $(hostname)"
        echo "OS: $(uname -a)"
        echo "Node.js: $(node --version)"
        echo "npm: $(npm --version)"
        echo ""
        
        echo "=== PROJECT INFORMATION ==="
        echo "Project Root: $PROJECT_ROOT"
        echo "Backend URL: $BACKEND_URL"
        echo "Frontend URL: $FRONTEND_URL"
        echo "Git SHA: $(git rev-parse HEAD 2>/dev/null || echo 'Not a git repository')"
        echo "Git Branch: $(git branch --show-current 2>/dev/null || echo 'Not a git repository')"
        echo ""
        
        echo "=== ENVIRONMENT VARIABLES ==="
        echo "NODE_ENV: ${NODE_ENV:-NOT_SET}"
        echo "PORT: ${PORT:-NOT_SET}"
        echo "JWT_SECRET: ${JWT_SECRET:+SET}"
        echo "JWT_EXPIRES_IN: ${JWT_EXPIRES_IN:-NOT_SET}"
        echo "DATABASE_URL: ${DATABASE_URL:+SET}"
        echo "CORS_ALLOWED_ORIGINS: ${CORS_ALLOWED_ORIGINS:-NOT_SET}"
        echo "RATE_LIMIT_ENABLED: ${RATE_LIMIT_ENABLED:-NOT_SET}"
        echo "HELMET_ENABLED: ${HELMET_ENABLED:-NOT_SET}"
    } > "$OUTPUT_DIR/environment/system-info.txt"
    
    # Package.json information
    if [[ -f "$PROJECT_ROOT/package.json" ]]; then
        cp "$PROJECT_ROOT/package.json" "$OUTPUT_DIR/environment/"
        log_info "Package.json captured"
    fi
    
    # Environment files (redacted)
    if [[ -f "$PROJECT_ROOT/.env" ]]; then
        # Create redacted version
        grep -v -E "(SECRET|PASSWORD|TOKEN|KEY)" "$PROJECT_ROOT/.env" > "$OUTPUT_DIR/environment/env-redacted.txt" 2>/dev/null || echo "No .env file found or no secrets to redact"
        log_info "Environment file captured (redacted)"
    fi
    
    log_success "Environment information captured"
}

# Run backend diagnostics
run_backend_diagnostics() {
    log_step "Running backend diagnostics..."
    
    cd "$PROJECT_ROOT"
    
    # Check if dependencies are installed
    if [[ ! -d "node_modules" ]]; then
        log_warning "Dependencies not installed, installing now..."
        npm install
    fi
    
    # Run TypeScript diagnostics
    if [[ -f "tsconfig.json" ]]; then
        log_info "Running TypeScript compilation check..."
        npm run build > "$OUTPUT_DIR/backend/typescript-build.log" 2>&1 || {
            log_warning "TypeScript build failed, but continuing with diagnostics"
        }
    fi
    
    # Run authentication diagnostics
    if [[ -f "scripts/auth-diagnostics.ts" ]]; then
        log_info "Running authentication diagnostics..."
        BACKEND_URL="$BACKEND_URL" FRONTEND_URL="$FRONTEND_URL" npx ts-node scripts/auth-diagnostics.ts > "$OUTPUT_DIR/backend/auth-diagnostics.log" 2>&1 || {
            log_warning "Authentication diagnostics failed, but continuing"
        }
        
        # Copy the generated report if it exists
        if [[ -f "auth-diagnostics-report.json" ]]; then
            cp "auth-diagnostics-report.json" "$OUTPUT_DIR/backend/"
            log_info "Authentication diagnostics report captured"
        fi
    fi
    
    # Run browser diagnostics
    if [[ -f "scripts/browser-auth-diagnostics.js" ]]; then
        log_info "Running browser authentication diagnostics..."
        BACKEND_URL="$BACKEND_URL" FRONTEND_URL="$FRONTEND_URL" node scripts/browser-auth-diagnostics.js > "$OUTPUT_DIR/backend/browser-diagnostics.log" 2>&1 || {
            log_warning "Browser diagnostics failed, but continuing"
        }
        
        # Copy the generated report if it exists
        if [[ -f "browser-auth-diagnostics-report.json" ]]; then
            cp "browser-auth-diagnostics-report.json" "$OUTPUT_DIR/backend/"
            log_info "Browser diagnostics report captured"
        fi
    fi
    
    log_success "Backend diagnostics completed"
}

# Capture network diagnostics
capture_network_diagnostics() {
    log_step "Capturing network diagnostics..."
    
    # Test backend connectivity
    {
        echo "=== BACKEND CONNECTIVITY TEST ==="
        echo "Testing connection to: $BACKEND_URL"
        echo ""
        
        # Test basic connectivity
        if curl -s --connect-timeout 10 "$BACKEND_URL/health" > /dev/null 2>&1; then
            echo "✅ Backend is reachable"
        else
            echo "❌ Backend is not reachable"
        fi
        
        echo ""
        echo "=== CORS PREFLIGHT TEST ==="
        curl -s -I -X OPTIONS \
            -H "Origin: $FRONTEND_URL" \
            -H "Access-Control-Request-Method: POST" \
            -H "Access-Control-Request-Headers: content-type" \
            "$BACKEND_URL/auth/login" 2>&1 || echo "CORS preflight test failed"
        
        echo ""
        echo "=== HEALTH ENDPOINT TEST ==="
        curl -s "$BACKEND_URL/health" 2>&1 || echo "Health endpoint test failed"
        
    } > "$OUTPUT_DIR/network/connectivity-test.txt"
    
    # Test specific endpoints
    {
        echo "=== ENDPOINT AVAILABILITY TEST ==="
        
        endpoints=("/auth/login" "/auth/register" "/auth/profile" "/auth/refresh" "/auth/logout")
        
        for endpoint in "${endpoints[@]}"; do
            echo "Testing: $endpoint"
            if curl -s --connect-timeout 5 "$BACKEND_URL$endpoint" > /dev/null 2>&1; then
                echo "  ✅ Available"
            else
                echo "  ❌ Not available"
            fi
        done
        
    } > "$OUTPUT_DIR/network/endpoint-test.txt"
    
    log_success "Network diagnostics captured"
}

# Capture logs
capture_logs() {
    log_step "Capturing application logs..."
    
    # Check for common log locations
    log_locations=(
        "/var/log/nginx/access.log"
        "/var/log/nginx/error.log"
        "/var/log/app/backend.log"
        "/var/log/app/error.log"
        "$PROJECT_ROOT/logs"
        "$PROJECT_ROOT/*.log"
    )
    
    for location in "${log_locations[@]}"; do
        if [[ -f "$location" ]]; then
            log_info "Found log file: $location"
            cp "$location" "$OUTPUT_DIR/logs/" 2>/dev/null || {
                log_warning "Could not copy log file: $location"
            }
        elif [[ -d "$location" ]]; then
            log_info "Found log directory: $location"
            cp -r "$location" "$OUTPUT_DIR/logs/" 2>/dev/null || {
                log_warning "Could not copy log directory: $location"
            }
        fi
    done
    
    # Capture recent system logs if available
    if command -v journalctl &> /dev/null; then
        log_info "Capturing recent system logs..."
        journalctl --since "1 hour ago" --no-pager > "$OUTPUT_DIR/logs/system-logs.txt" 2>/dev/null || {
            log_warning "Could not capture system logs"
        }
    fi
    
    log_success "Logs captured"
}

# Generate diagnostic summary
generate_summary() {
    log_step "Generating diagnostic summary..."
    
    {
        echo "# Zephix Authentication Diagnostics Summary"
        echo ""
        echo "**Generated:** $(date -u)"
        echo "**Backend URL:** $BACKEND_URL"
        echo "**Frontend URL:** $FRONTEND_URL"
        echo ""
        
        echo "## Files Collected"
        echo ""
        echo "### Backend Diagnostics"
        if [[ -f "$OUTPUT_DIR/backend/auth-diagnostics-report.json" ]]; then
            echo "- ✅ Authentication diagnostics report"
        fi
        if [[ -f "$OUTPUT_DIR/backend/browser-diagnostics-report.json" ]]; then
            echo "- ✅ Browser diagnostics report"
        fi
        echo "- 📝 TypeScript build log"
        echo "- 📝 Authentication diagnostics log"
        echo "- 📝 Browser diagnostics log"
        echo ""
        
        echo "### Environment Information"
        echo "- 📋 System information"
        echo "- 📋 Package.json"
        echo "- 📋 Environment variables (redacted)"
        echo ""
        
        echo "### Network Diagnostics"
        echo "- 🌐 Connectivity tests"
        echo "- 🌐 Endpoint availability tests"
        echo ""
        
        echo "### Application Logs"
        echo "- 📝 Application logs (if available)"
        echo "- 📝 System logs (if available)"
        echo ""
        
        echo "## Next Steps"
        echo ""
        echo "1. **Review the diagnostic reports** in the backend/ directory"
        echo "2. **Check for critical issues** in the summary sections"
        echo "3. **Verify environment configuration** in the environment/ directory"
        echo "4. **Test network connectivity** using the network/ directory"
        echo "5. **Analyze logs** for any error patterns"
        echo ""
        
        echo "## Common Issues to Check"
        echo ""
        echo "- **JWT Configuration**: Verify JWT_SECRET is set and secure"
        echo "- **Database Connection**: Check DATABASE_URL and connectivity"
        echo "- **CORS Settings**: Verify CORS_ALLOWED_ORIGINS includes frontend URL"
        echo "- **Rate Limiting**: Check if rate limiting is properly configured"
        echo "- **Security Headers**: Verify Helmet and security middleware"
        echo ""
        
        echo "## Support Information"
        echo ""
        echo "If you need assistance with these diagnostics:"
        echo "1. Share the entire diagnostic package"
        echo "2. Include any error messages you see in the browser"
        echo "3. Note the exact steps that reproduce the issue"
        echo "4. Provide browser console logs and network tab information"
        
    } > "$OUTPUT_DIR/README.md"
    
    log_success "Diagnostic summary generated"
}

# Create final archive
create_archive() {
    log_step "Creating diagnostic package archive..."
    
    archive_name="$OUTPUT_DIR.tar.gz"
    
    # Remove any existing archive
    rm -f "$archive_name"
    
    # Create archive
    tar -czf "$archive_name" "$OUTPUT_DIR"
    
    # Clean up temporary directory
    rm -rf "$OUTPUT_DIR"
    
    log_success "Diagnostic package created: $archive_name"
    
    # Display final information
    echo ""
    echo "🎉 DIAGNOSTIC PACKAGE COMPLETED!"
    echo "=================================="
    echo ""
    echo "📦 Package: $archive_name"
    echo "📁 Size: $(du -h "$archive_name" | cut -f1)"
    echo ""
    echo "📋 Contents:"
    echo "  • Backend diagnostics and reports"
    echo "  • Environment configuration (redacted)"
    echo "  • Network connectivity tests"
    echo "  • Application logs (if available)"
    echo "  • Comprehensive README with next steps"
    echo ""
    echo "🔧 Next Steps:"
    echo "  1. Review the README.md in the package"
    echo "  2. Check for critical issues in the reports"
    echo "  3. Address any configuration problems"
    echo "  4. Test the authentication flow manually"
    echo "  5. Share the package if you need assistance"
    echo ""
}

# Main execution
main() {
    echo "🚀 Zephix Authentication Diagnostics Package Generator"
    echo "====================================================="
    echo ""
    
    check_prerequisites
    setup_output_directory
    capture_environment
    run_backend_diagnostics
    capture_network_diagnostics
    capture_logs
    generate_summary
    create_archive
    
    echo ""
    log_success "Diagnostic package generation completed successfully!"
}

# Run main function
main "$@"
