const bcrypt = require('bcrypt');

async function testPassword() {
  const password = 'Admin123!';
  const hash = '$2b$10$WHi9sIfMbRbXFbUGzrGapOg7GlOhEfhotRDLeT28vGDwpPiKdKQJS';

  console.log('Testing password:', password);
  console.log('Hash:', hash);

  const isValid = await bcrypt.compare(password, hash);
  console.log('Password valid:', isValid);

  // Also test with a fresh hash
  const newHash = await bcrypt.hash(password, 10);
  console.log('New hash:', newHash);

  const isValidNew = await bcrypt.compare(password, newHash);
  console.log('New hash valid:', isValidNew);
}

testPassword().catch(console.error);
