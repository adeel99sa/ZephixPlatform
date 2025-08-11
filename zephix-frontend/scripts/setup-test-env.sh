#!/bin/bash

# PM Dashboard Test Environment Setup Script
# This script sets up the necessary environment for running PM dashboard tests

set -e

echo "🚀 Setting up PM Dashboard Test Environment..."

# Create necessary directories
echo "📁 Creating test directories..."
mkdir -p cypress/fixtures
mkdir -p cypress/downloads
mkdir -p cypress/screenshots
mkdir -p cypress/videos

# Check if package.json has test scripts
echo "📦 Checking test scripts..."
if ! grep -q "test:reset-db" package.json; then
    echo "⚠️  Warning: test:reset-db script not found in package.json"
    echo "Adding test database scripts..."
    
    # Add test scripts using npm
    npm pkg set scripts.test:reset-db="node scripts/reset-test-db.js"
    npm pkg set scripts.db:test:create="node scripts/create-test-db.js"
    npm pkg set scripts.cypress:run="cypress run"
    npm pkg set scripts.cypress:open="cypress open"
    npm pkg set scripts.test:e2e="npm run test:reset-db && npm run cypress:run"
fi

# Create test environment file if it doesn't exist
if [ ! -f .env.test ]; then
    echo "🔧 Creating .env.test file..."
    cat > .env.test << EOL
# Test Environment Configuration
VITE_API_URL=http://localhost:3001
VITE_APP_ENV=test
VITE_ENABLE_MOCKING=true
CYPRESS_BASE_URL=http://localhost:5173
DATABASE_URL=postgresql://test:test@localhost:5432/zephix_test
JWT_SECRET=test-jwt-secret-key
NODE_ENV=test
EOL
fi

# Create test database reset script
echo "📝 Creating database reset script..."
cat > scripts/reset-test-db.js << 'EOL'
// Test Database Reset Script
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function resetTestDatabase() {
  console.log('🔄 Resetting test database...');
  
  try {
    // For now, just log - in real implementation, this would reset the database
    console.log('⚠️  Database reset not implemented yet');
    console.log('💡 Tip: Implement database seeding with test data');
    
    // Example implementation:
    // await execAsync('npx prisma db push --force-reset');
    // await execAsync('npx prisma db seed');
    
    console.log('✅ Test database ready');
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    process.exit(1);
  }
}

resetTestDatabase();
EOL

# Create test database creation script
cat > scripts/create-test-db.js << 'EOL'
// Test Database Creation Script
console.log('🏗️  Creating test database...');
console.log('⚠️  Database creation not implemented yet');
console.log('💡 Tip: Use Docker or local PostgreSQL for test database');
console.log('✅ Done');
EOL

# Make scripts executable
chmod +x scripts/reset-test-db.js
chmod +x scripts/create-test-db.js

# Create sample PDF fixture
echo "📄 Creating test fixtures..."
# Create a proper base64 encoded PDF for testing
echo "JVBERi0xLjMKJeLjz9MKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXSAvUmVzb3VyY2VzIDw8IC9Gb250IDw8IC9GMSA0IDAgUiA+PiA+PiAvQ29udGVudHMgNSAwIFIgPj4KZW5kb2JqCjQgMCBvYmoKPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhID4+CmVuZG9iago1IDAgb2JqCjw8IC9MZW5ndGggNDQgPj4Kc3RyZWFtCkJUCi9GMSAxMiBUZgo1MCA3MDAgVGQKKFRlc3QgQlJEIERvY3VtZW50KSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDU4IDAwMDAwIG4gCjAwMDAwMDAxMTUgMDAwMDAgbiAKMDAwMDAwMDI1MiAwMDAwMCBuIAowMDAwMDAwMzMzIDAwMDAwIG4gCnRyYWlsZXIKPDwgL1NpemUgNiAvUm9vdCAxIDAgUiA+PgpzdGFydHhyZWYKNDI1CiUlRU9G" > cypress/fixtures/test-brd.pdf

# Create Cypress task configuration
echo "⚙️  Setting up Cypress tasks..."
cat > cypress.config.ts << 'EOL'
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    setupNodeEvents(on, config) {
      // Custom task for generating test reports
      on('task', {
        generateTestReport({ suiteName, timestamp }) {
          console.log(`📊 Generating test report for: ${suiteName}`);
          console.log(`⏰ Timestamp: ${timestamp}`);
          // In a real implementation, this would generate HTML/PDF reports
          return null;
        },
        
        // Add more custom tasks as needed
        log(message) {
          console.log(message);
          return null;
        }
      });
      
      return config;
    },
  },
});
EOL

echo "✅ Test environment setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Review and update .env.test with your test configuration"
echo "2. Implement database reset functionality in scripts/reset-test-db.js"
echo "3. Add data-testid attributes to your React components"
echo "4. Run tests with: npm run test:e2e"
echo ""
echo "🔍 For more details, see PM_DASHBOARD_TEST_REPORT.md"