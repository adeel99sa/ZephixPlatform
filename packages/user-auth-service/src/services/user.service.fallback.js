const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { AppDataSource } = require('../infrastructure/config/database.config');
const { UserEntity } = require('../domain/entities/user.entity');

class UserService {
  constructor() {
    this.userRepository = AppDataSource.getRepository(UserEntity);
  }

  async registerUser(userData) {
    try {
      // Check if user already exists
      const existingUser = await this.userRepository.findOne({
        where: { email: userData.email }
      });

      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

      // Create new user entity with manual UUID generation
      const user = this.userRepository.create({
        id: uuidv4(), // Manual UUID generation
        email: userData.email.toLowerCase(),
        passwordHash: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        isActive: true,
        emailVerified: false
      });

      // Save to database
      const savedUser = await this.userRepository.save(user);

      console.log(`✅ User registered successfully: ${savedUser.email} (ID: ${savedUser.id})`);
      return savedUser;

    } catch (error) {
      console.error('❌ User registration failed:', error.message);
      throw error;
    }
  }
}

module.exports = new UserService(); 