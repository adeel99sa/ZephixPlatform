const { execSync } = require('child_process');

// Test the resource conflicts endpoint
console.log('🧪 Testing Resource Conflicts System...\n');

// First, let's check if the backend is running
try {
  const response = execSync('curl -s http://localhost:3000/api/health || echo "Backend not responding"', { encoding: 'utf8' });
  console.log('Backend status:', response.trim());
} catch (error) {
  console.log('❌ Backend not running');
  process.exit(1);
}

// Test the conflicts endpoint (it will return 401 but that's expected)
console.log('\n🔍 Testing /api/resources/conflicts endpoint...');
try {
  const response = execSync('curl -s -w "\\nHTTP Status: %{http_code}\\n" http://localhost:3000/api/resources/conflicts', { encoding: 'utf8' });
  console.log('Response:', response);
} catch (error) {
  console.log('Error testing endpoint:', error.message);
}

// Test the frontend
console.log('\n🌐 Testing frontend...');
try {
  const response = execSync('curl -s http://localhost:5173 | grep -i "resource\\|conflict" | head -3', { encoding: 'utf8' });
  console.log('Frontend resource-related content:', response || 'No resource content found');
} catch (error) {
  console.log('Error testing frontend:', error.message);
}

console.log('\n✅ Test completed!');











