#!/bin/bash

# Local Landing Site Testing Script
# Run this before pushing to test the site locally

set -e

echo "🧪 Running local landing site tests..."
echo "====================================="

# Check if we're in the right directory
if [[ ! -f "index.html" ]]; then
    echo "❌ Error: Please run this script from the zephix-landing directory"
    exit 1
fi

# Install dependencies if needed
if ! command -v html-validate &> /dev/null; then
    echo "📦 Installing html-validate..."
    npm install -g html-validate
fi

if ! command -v htmlhint &> /dev/null; then
    echo "📦 Installing htmlhint..."
    npm install -g htmlhint
fi

# HTML Validation
echo ""
echo "🔍 Running HTML validation..."
html-validate *.html 2>/dev/null || {
    echo "Setting up HTML validation config..."
    cat > .htmlvalidate.json << 'EOF'
{
  "extends": ["html-validate:recommended"],
  "rules": {
    "no-trailing-whitespace": "off",
    "void-style": ["error", { "style": "omit" }],
    "script-element": "off",
    "no-inline-style": "off",
    "require-sri": "off",
    "no-unknown-elements": "off"
  }
}
EOF
    html-validate *.html
}

# HTML Linting
echo ""
echo "🧹 Running HTMLHint linting..."
htmlhint *.html 2>/dev/null || {
    echo "Setting up HTMLHint config..."
    cat > .htmlhintrc << 'EOF'
{
  "tagname-lowercase": true,
  "attr-lowercase": true,
  "attr-value-double-quotes": true,
  "doctype-first": true,
  "tag-pair": true,
  "spec-char-escape": true,
  "id-unique": true,
  "src-not-empty": true,
  "title-require": true,
  "doctype-html5": true,
  "style-disabled": false,
  "inline-style-disabled": false,
  "inline-script-disabled": false
}
EOF
    htmlhint *.html
}

# Check required files
echo ""
echo "📁 Checking file structure..."
required_files=(
    "index.html"
    "styles.css"
    "404.html"
    "privacy.html"
    "terms.html"
    "robots.txt"
    "netlify.toml"
    "vercel.json"
)

missing_files=()
for file in "${required_files[@]}"; do
    if [[ ! -f "$file" ]]; then
        missing_files+=("$file")
    fi
done

if [[ ${#missing_files[@]} -ne 0 ]]; then
    echo "❌ Missing required files:"
    printf '  %s\n' "${missing_files[@]}"
    exit 1
fi

echo "✅ All required files present"

# Check internal links
echo ""
echo "🔗 Checking internal links..."
python3 -c "
import re
import os

def check_links():
    errors = []
    files = ['index.html', '404.html', 'privacy.html', 'terms.html']
    
    for file in files:
        if not os.path.exists(file):
            continue
            
        with open(file, 'r') as f:
            content = f.read()
            
        # Check internal links
        internal_links = re.findall(r'href=[\"\']/([\\w\\.-]+\\.html?)[\"\'']', content)
        for link in internal_links:
            if not os.path.exists(link):
                errors.append(f'Broken internal link in {file}: /{link}')
                
        # Check anchors
        anchor_links = re.findall(r'href=[\"\']\#([\\w-]+)[\"\'']', content)
        for anchor in anchor_links:
            if f'id=\"{anchor}\"' not in content and f'id=\'{anchor}\'' not in content:
                errors.append(f'Missing anchor in {file}: #{anchor}')
    
    return errors

errors = check_links()
if errors:
    print('❌ Link check failed:')
    for error in errors:
        print(f'  {error}')
    exit(1)
else:
    print('✅ All internal links are valid')
"

# Start local server for testing
echo ""
echo "🌐 Starting local server..."
echo "Open http://localhost:8000 to test the site"
echo "Press Ctrl+C to stop the server"
echo ""

# Start Python server
python3 -m http.server 8000 2>/dev/null || python -m SimpleHTTPServer 8000
