const fs = require('fs');

const filePath = './src/modules/auth/auth.service.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Replace the specific query in the login method
const oldQuery = `      user = await this.userRepository.findOne({
        where: { email: email.toLowerCase() }
      });`;

const newQuery = `      user = await this.userRepository.findOne({
        where: { email: email.toLowerCase() },
        select: {
          id: true,
          email: true,
          password: true,
          firstName: true,
          lastName: true,
          isActive: true,
          organizationId: true,
          organizationRole: true,
          role: true
        }
      });`;

if (content.includes(oldQuery)) {
  content = content.replace(oldQuery, newQuery);
  fs.writeFileSync(filePath, content);
  console.log('✅ Successfully fixed login query to include password');
} else {
  console.log('❌ Could not find exact query pattern');
  console.log('Trying alternative fix...');
  
  // Alternative: Remove select: false from User entity
  const userEntityPath = './src/modules/users/entities/user.entity.ts';
  let userEntity = fs.readFileSync(userEntityPath, 'utf8');
  
  // Change select: false to select: true for password
  userEntity = userEntity.replace(
    '@Column({ select: false })',
    '@Column()'
  );
  
  fs.writeFileSync(userEntityPath, userEntity);
  console.log('✅ Removed select: false from password field in User entity');
}
