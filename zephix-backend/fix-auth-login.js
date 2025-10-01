const fs = require('fs');

const filePath = './src/modules/auth/auth.service.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the login method's user query
content = content.replace(
  /const user = await this\.userRepository\.findOne\({[\s\S]*?where: { email: email\.toLowerCase\(\) }[\s\S]*?}\);/,
  `const user = await this.userRepository.findOne({
        where: { email: email.toLowerCase() },
        select: ['id', 'email', 'password', 'firstName', 'lastName', 'isActive', 'organizationId', 'organizationRole', 'role']
      });`
);

fs.writeFileSync(filePath, content);
console.log('✅ Fixed auth service login method');
