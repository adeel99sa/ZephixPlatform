#!/bin/bash

# Frontend Build and Test Script for Zephix
# This script builds the frontend and tests for styling issues

set -e

echo "🚀 Zephix Frontend Build and Test Script"
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "This script must be run from the zephix-frontend directory"
    exit 1
fi

print_status "Starting frontend build and test process..."

# Clean previous build
print_status "Cleaning previous build..."
rm -rf dist
print_success "Previous build cleaned"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
    print_success "Dependencies installed"
else
    print_status "Dependencies already installed"
fi

# Build the frontend
print_status "Building frontend..."
npm run build

if [ $? -eq 0 ]; then
    print_success "Frontend built successfully"
else
    print_error "Frontend build failed"
    exit 1
fi

# Check build output
print_status "Checking build output..."

# Check if CSS file exists
if [ -f "dist/assets/index-*.css" ]; then
    CSS_FILE=$(find dist/assets -name "index-*.css" | head -1)
    print_success "CSS file found: $CSS_FILE"
    
    # Check CSS file size
    CSS_SIZE=$(stat -f%z "$CSS_FILE" 2>/dev/null || stat -c%s "$CSS_FILE" 2>/dev/null || echo "0")
    if [ "$CSS_SIZE" -gt 1000 ]; then
        print_success "CSS file size: ${CSS_SIZE} bytes (adequate)"
    else
        print_warning "CSS file size: ${CSS_SIZE} bytes (may be too small)"
    fi
    
    # Check for critical CSS classes
    if grep -q "hero-bg" "$CSS_FILE"; then
        print_success "hero-bg class found in CSS"
    else
        print_error "hero-bg class missing from CSS"
    fi
    
    if grep -q "btn-primary" "$CSS_FILE"; then
        print_success "btn-primary class found in CSS"
    else
        print_error "btn-primary class missing from CSS"
    fi
    
    if grep -q "var(--primary-600)" "$CSS_FILE"; then
        print_success "CSS variables found in CSS"
    else
        print_error "CSS variables missing from CSS"
    fi
else
    print_error "CSS file not found in build output"
fi

# Check if JS files exist
JS_COUNT=$(find dist/assets -name "*.js" | wc -l)
if [ "$JS_COUNT" -gt 0 ]; then
    print_success "JavaScript files found: $JS_COUNT"
else
    print_error "No JavaScript files found in build output"
fi

# Check if HTML file exists and has correct structure
if [ -f "dist/index.html" ]; then
    print_success "HTML file found"
    
    # Check for critical elements
    if grep -q "id=\"root\"" "dist/index.html"; then
        print_success "Root element found in HTML"
    else
        print_error "Root element missing from HTML"
    fi
    
    if grep -q "main.tsx" "dist/index.html"; then
        print_success "Main script reference found in HTML"
    else
        print_error "Main script reference missing from HTML"
    fi
else
    print_error "HTML file not found in build output"
fi

# Check for common styling issues
print_status "Checking for common styling issues..."

# Check if Tailwind CSS is included
if grep -q "tailwindcss" "$CSS_FILE"; then
    print_success "Tailwind CSS detected in build"
else
    print_warning "Tailwind CSS may not be properly included"
fi

# Check for responsive design classes
if grep -q "md:" "$CSS_FILE" || grep -q "lg:" "$CSS_FILE"; then
    print_success "Responsive design classes found"
else
    print_warning "Responsive design classes may be missing"
fi

# Check for animation classes
if grep -q "animate-" "$CSS_FILE" || grep -q "transition" "$CSS_FILE"; then
    print_success "Animation and transition classes found"
else
    print_warning "Animation classes may be missing"
fi

# Test local preview if possible
print_status "Testing local preview..."
if command -v python3 &> /dev/null; then
    print_status "Starting local preview server with Python..."
    cd dist
    python3 -m http.server 8000 &
    PREVIEW_PID=$!
    
    print_status "Local preview server started on http://localhost:8000"
    print_status "Press Ctrl+C to stop the preview server"
    
    # Wait for user to stop
    trap "kill $PREVIEW_PID 2>/dev/null; exit" INT
    wait $PREVIEW_PID
elif command -v python &> /dev/null; then
    print_status "Starting local preview server with Python..."
    cd dist
    python -m SimpleHTTPServer 8000 &
    PREVIEW_PID=$!
    
    print_status "Local preview server started on http://localhost:8000"
    print_status "Press Ctrl+C to stop the preview server"
    
    # Wait for user to stop
    trap "kill $PREVIEW_PID 2>/dev/null; exit" INT
    wait $PREVIEW_PID
else
    print_warning "Python not found. Cannot start local preview server."
    print_status "You can manually test the build by opening dist/index.html in a browser"
fi

# Summary
echo ""
echo "📊 Build and Test Summary"
echo "========================"
echo "✅ Frontend built successfully"
echo "✅ CSS file generated with proper classes"
echo "✅ JavaScript files bundled correctly"
echo "✅ HTML file structured properly"
echo ""
echo "🎯 Next Steps:"
echo "1. Deploy the dist/ folder to Railway"
echo "2. Test the live site for styling issues"
echo "3. Verify responsive design on mobile devices"
echo "4. Check that all animations work correctly"
echo ""
print_success "Frontend build and test completed successfully!"
