const bcrypt = require('bcrypt');

async function generateHash() {
  const password = 'Test123!@#';
  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);
  console.log('Password:', password);
  console.log('Hash:', hash);
  
  // Test it works
  const isMatch = await bcrypt.compare(password, hash);
  console.log('Verification:', isMatch ? 'WORKS' : 'FAILED');
}

generateHash();
