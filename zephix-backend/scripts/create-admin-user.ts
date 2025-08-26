import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/modules/users/entities/user.entity';
import { Repository } from 'typeorm';

async function createAdminUser() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const userRepository = app.get<Repository<User>>(getRepositoryToken(User));
    
    // Check existing users
    const existingUsers = await userRepository.find();
    console.log('\n=== Existing Users ===');
    existingUsers.forEach(user => {
      console.log(`- ${user.email} (Role: ${user.role})`);
    });
    
    // Check if admin user exists
    const adminUser = existingUsers.find(user => 
      user.role.toLowerCase() === 'admin' || user.role.toLowerCase() === 'owner'
    );
    
    if (adminUser) {
      console.log(`\n✅ Admin user already exists: ${adminUser.email} (Role: ${adminUser.role})`);
      return;
    }
    
    // Create admin user if none exists
    console.log('\n🔧 Creating admin user...');
    
    const adminUserData = {
      email: 'admin@zephix.ai',
      password: 'Admin123!',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isEmailVerified: true,
      isActive: true
    };
    
    // Hash password
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(adminUserData.password, 10);
    
    const newAdminUser = userRepository.create({
      ...adminUserData,
      password: hashedPassword
    });
    
    const savedAdminUser = await userRepository.save(newAdminUser);
    console.log(`✅ Admin user created successfully: ${savedAdminUser.email} (Role: ${savedAdminUser.role})`);
    console.log(`📧 Email: ${adminUserData.email}`);
    console.log(`🔑 Password: ${adminUserData.password}`);
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await app.close();
  }
}

createAdminUser().catch(console.error);
