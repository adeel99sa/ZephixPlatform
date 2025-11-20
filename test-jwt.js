const jwt = require('jsonwebtoken');

// Test with the JWT secret from .env
const secret = 'your-super-secret-jwt-key-here-min-32-chars';

const payload = {
  sub: '917cbd75-f1a1-450e-afbb-389d288f602c',
  email: 'admin@zephix.ai',
  organizationId: '7a91cd92-e823-411e-aee1-f4efe8dcf9b1',
  role: 'admin'
};

console.log('Payload:', payload);
console.log('Secret:', secret);

try {
  const token = jwt.sign(payload, secret, { expiresIn: '15m' });
  console.log('Generated token:', token);

  const decoded = jwt.verify(token, secret);
  console.log('Decoded token:', decoded);
} catch (error) {
  console.error('JWT error:', error);
}
