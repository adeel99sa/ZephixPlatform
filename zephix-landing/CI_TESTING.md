# CI Testing Documentation

This document explains the comprehensive CI/CD pipeline for the Zephix landing site.

## 🚀 GitHub Actions Workflow

The `.github/workflows/landing-ci.yml` workflow runs automatically on:
- **Push to main/develop** branches
- **Pull requests** to main
- **Manual trigger** via GitHub Actions UI
- **Changes to landing site files** only

## 🧪 Test Suite Overview

### 1. HTML Validation
**Tools:** `html-validate`, `htmlhint`

**Checks:**
- ✅ Valid HTML5 structure
- ✅ Proper tag nesting
- ✅ Required meta tags
- ✅ Accessibility attributes
- ✅ Semantic markup

**Configuration:**
```json
{
  "extends": ["html-validate:recommended"],
  "rules": {
    "no-trailing-whitespace": "off",
    "void-style": ["error", { "style": "omit" }],
    "script-element": "off",
    "no-inline-style": "off"
  }
}
```

### 2. CSS Validation
**Tools:** `css-validator-cli`

**Checks:**
- ✅ Valid CSS syntax
- ✅ Browser compatibility
- ⚠️ Vendor prefix warnings (non-blocking)

### 3. Link Checker
**Custom implementation**

**Checks:**
- ✅ Internal page links (`/privacy.html`, `/terms.html`)
- ✅ Anchor links (`#features`, `#pricing`)
- ✅ File existence validation
- ❌ **Fails on broken links**

**Example broken link detection:**
```javascript
// Checks for links like href="/missing-page.html"
const internalLinks = content.match(/href=["']\/([\w\.-]+\.html?)["']/g);
```

### 4. File Structure Validation
**Required files checked:**
- `index.html` - Main landing page
- `styles.css` - Stylesheet
- `404.html` - Error page
- `privacy.html` - Privacy policy
- `terms.html` - Terms of service
- `robots.txt` - SEO configuration
- `netlify.toml` - Netlify deployment config
- `vercel.json` - Vercel deployment config
- `README.md` - Documentation

### 5. Form Validation
**Checks:**
- ✅ Waitlist form presence
- ✅ Required form fields (email, submit)
- ✅ HTTPS form action
- ✅ JavaScript validation code
- ✅ Proper form structure

### 6. SEO & Meta Tag Validation
**Checks for each page:**
- ✅ `<title>` tag
- ✅ Meta description
- ✅ Viewport meta tag
- ✅ Character encoding
- ✅ Open Graph tags (index.html)
- ✅ Favicon links

### 7. Performance Checks
**File size limits:**
- `index.html`: 100KB max
- `styles.css`: 50KB max
- `404.html`: 50KB max

**Best practices:**
- ✅ Preconnect hints for external resources
- ⚠️ Image lazy loading recommendations
- ⚠️ Minification suggestions

### 8. Security Validation
**Checks:**
- ✅ No insecure HTTP URLs (except localhost)
- ✅ External links with `rel="noopener"`
- ✅ No exposed secrets or API keys
- ✅ Potential XSS vulnerability patterns

### 9. Configuration Validation
**Netlify (`netlify.toml`):**
- ✅ Build configuration
- ✅ Redirect rules
- ✅ Security headers

**Vercel (`vercel.json`):**
- ✅ Headers configuration
- ✅ Routing rules

**SEO (`robots.txt`):**
- ✅ User-agent directives
- ✅ Allow/Disallow rules

## 🏃‍♂️ Running Tests Locally

### Quick Test
```bash
cd zephix-landing
./test-local.sh
```

### Manual Testing
```bash
# Install dependencies
npm install -g html-validate htmlhint

# Run individual checks
html-validate *.html
htmlhint *.html

# Start local server
python3 -m http.server 8000
```

### NPM Scripts
```bash
npm run lint         # Run HTML linting
npm run test         # Run local test script
npm run serve        # Start local server
npm run validate     # Run all validations
```

## 🔧 CI Configuration

### Triggers
```yaml
on:
  push:
    branches: [ main, develop ]
    paths: [ 'zephix-landing/**' ]
  pull_request:
    branches: [ main ]
    paths: [ 'zephix-landing/**' ]
```

### Environment
- **OS:** Ubuntu Latest
- **Node.js:** Version 20
- **Cache:** NPM dependencies cached
- **Timeout:** 10 minutes default

### Failure Handling
- **Hard failures:** Broken links, invalid HTML, missing files
- **Soft warnings:** Performance suggestions, security best practices
- **Artifacts:** Validation configs uploaded on failure

## 📊 Status Badge

The README includes a status badge showing CI health:
```markdown
[![Landing Site CI](https://github.com/adeel99sa/ZephixPlatform/actions/workflows/landing-ci.yml/badge.svg)](https://github.com/adeel99sa/ZephixPlatform/actions/workflows/landing-ci.yml)
```

## 🚨 Common Failures

### Broken Links
```
❌ Broken internal link in index.html: /missing-page.html
```
**Fix:** Ensure all linked files exist or update links

### Missing Meta Tags
```
❌ Missing meta tag in index.html: name="description"
```
**Fix:** Add required meta tags to HTML head

### Form Validation Issues
```
❌ Missing required form field: type="email"
```
**Fix:** Ensure form has proper structure and fields

### File Size Warnings
```
⚠️ index.html is 105.2KB (recommended max: 100KB)
```
**Fix:** Optimize HTML, remove unnecessary content

### Security Warnings
```
⚠️ index.html: External link missing rel="noopener"
```
**Fix:** Add security attributes to external links

## 🔄 CI/CD Best Practices

1. **Run tests locally** before pushing
2. **Keep files under size limits** for performance
3. **Fix broken links immediately** (blocks deployment)
4. **Update meta tags** when content changes
5. **Test forms thoroughly** after modifications
6. **Review security warnings** and fix critical issues
7. **Monitor CI status badge** in README

## 🎯 Success Criteria

All checks must pass for a successful CI run:
- ✅ HTML validation: PASS
- ✅ CSS validation: PASS  
- ✅ Link checker: PASS
- ✅ File structure: PASS
- ✅ Form validation: PASS
- ✅ SEO validation: PASS
- ✅ Performance: PASS
- ✅ Security: PASS
- ✅ Configuration: PASS

**Result:** 🚀 Landing site ready for deployment!
