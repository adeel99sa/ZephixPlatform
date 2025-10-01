const fs = require('fs');
const path = require('path');

// Check which User entity is being used in auth
const authServicePath = './src/modules/auth/auth.service.ts';
const authContent = fs.readFileSync(authServicePath, 'utf8');

console.log('Auth Service User Import:');
const userImportMatch = authContent.match(/import.*User.*from.*/g);
console.log(userImportMatch ? userImportMatch[0] : 'No User import found');

// Check the actual User entity
const userEntityPath = './src/modules/users/entities/user.entity.ts';
if (fs.existsSync(userEntityPath)) {
  const userContent = fs.readFileSync(userEntityPath, 'utf8');
  const hasSelectFalse = userContent.includes('select: false');
  console.log(`\nUser Entity has 'select: false' on password: ${hasSelectFalse}`);
}
