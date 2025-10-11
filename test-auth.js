const { execSync } = require('child_process');

console.log('🧪 Testing Authentication and Resource Conflicts...\n');

// Test login with demo account
console.log('1. Testing login with demo account...');
try {
  const loginResponse = execSync('curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d \'{"email":"adeel99sa@yahoo.com","password":"ReAdY4wK73967#!@"}\'', { encoding: 'utf8' });
  console.log('Login response:', loginResponse);
  
  const loginData = JSON.parse(loginResponse);
  if (loginData.data && loginData.data.accessToken) {
    console.log('✅ Login successful!');
    const token = loginData.data.accessToken;
    
    // Test conflicts endpoint with token
    console.log('\n2. Testing conflicts endpoint with authentication...');
    const conflictsResponse = execSync(`curl -s -H "Authorization: Bearer ${token}" http://localhost:3000/api/resources/conflicts`, { encoding: 'utf8' });
    console.log('Conflicts response:', conflictsResponse);
    
  } else {
    console.log('❌ Login failed:', loginData);
  }
} catch (error) {
  console.log('❌ Error:', error.message);
}
