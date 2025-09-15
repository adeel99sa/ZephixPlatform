const bcrypt = require('bcryptjs');

async function test() {
  const password = 'Test123!@#';
  const hash = await bcrypt.hash(password, 10);
  console.log('Hash:', hash);
  
  const valid = await bcrypt.compare(password, hash);
  console.log('Valid:', valid);
  
  // Test with a hash from your database
  // Replace this with actual hash from DB if you can get it
  const testHash = '$2a$10$...'; // You'll need to get this from DB
  const validDB = await bcrypt.compare(password, testHash);
  console.log('Valid against DB hash:', validDB);
}

test();
