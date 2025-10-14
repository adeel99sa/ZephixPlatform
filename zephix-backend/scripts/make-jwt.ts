const jwt = require('jsonwebtoken');

// Railway production JWT secret
const JWT_SECRET = '4853cdabe1e331e386c0e14ab3bdfef9ae190c6f289cbd02d5517f425b05eb70';

// Test user claims (from your previous successful login)
const payload = {
  sub: '8f83a908-abe3-4569-94af-8ca0b0629f57', // User ID
  email: 'adeel99sa@yahoo.com',
  role: 'admin',
  organizationId: '06b54693-2b4b-4c10-b553-6dea5c5631c9',
  workspaceId: '967f37e5-4749-4da2-a1a4-7fa7db96d002',
  organizationRole: 'admin'
};

// Generate token with 2-hour expiration
const token = jwt.sign(payload, JWT_SECRET, {
  algorithm: 'HS256',
  expiresIn: '2h'
});

console.log('Generated JWT Token:');
console.log(token);
console.log('\nPayload:');
console.log(JSON.stringify(payload, null, 2));
console.log('\nTest with:');
console.log(`curl -H "Authorization: Bearer ${token}" https://zephix-backend-production.up.railway.app/api/auth/me`);
