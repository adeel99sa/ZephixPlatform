const bcrypt = require('bcrypt');

async function testAuth() {
  const email = 'test@example.com';
  const password = 'test123456';
  const hash = '$2b$10$vRPsDbvC.9YNb7hX9VGzUuFHCn0bK6qhMhEcj8qdcWhdb2PPDa9SS';

  console.log('Testing authentication:');
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('Hash:', hash);

  const isValid = await bcrypt.compare(password, hash);
  console.log('Password valid:', isValid);

  if (!isValid) {
    console.log('Password comparison failed!');
    // Try with a fresh hash
    const newHash = await bcrypt.hash(password, 10);
    console.log('New hash:', newHash);
    const isValidNew = await bcrypt.compare(password, newHash);
    console.log('New hash valid:', isValidNew);
  }
}

testAuth().catch(console.error);
