// Test the resource conflicts service directly
const { execSync } = require('child_process');

console.log('🧪 Testing Resource Conflicts Service Directly...\n');

// Test the service method by creating a simple test script
const testScript = `
const { execSync } = require('child_process');

// First, let's test if we can call the service directly
console.log('Testing resource conflicts service...');

// Check if the backend is running
try {
  const healthResponse = execSync('curl -s http://localhost:3000/api/health', { encoding: 'utf8' });
  console.log('✅ Backend is running');
  
  // Test the conflicts endpoint
  const conflictsResponse = execSync('curl -s http://localhost:3000/api/resources/conflicts/test', { encoding: 'utf8' });
  console.log('Conflicts response:', conflictsResponse);
  
} catch (error) {
  console.log('❌ Error:', error.message);
}
`;

// Write and execute the test script
require('fs').writeFileSync('temp-test.js', testScript);
execSync('node temp-test.js');
require('fs').unlinkSync('temp-test.js');











