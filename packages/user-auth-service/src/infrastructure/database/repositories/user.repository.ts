import { Repository } from 'typeorm';
import { UserEntity } from '../../../domain/entities/user.entity';
import { CreateUserDto, UpdateUserDto } from '../../../application/dto/auth.dto';
import { IUserRepository } from '../../../domain/repositories/user-repository.interface';
import { AppDataSource } from '../../config/database.config';
import { Logger } from '../../logging/logger';

export class UserRepository implements IUserRepository {
  private repository: Repository<UserEntity>;
  private readonly logger = new Logger(UserRepository.name);

  constructor() {
    this.repository = AppDataSource.getRepository(UserEntity);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    try {
      return await this.repository.findOne({ 
        where: { email: email.toLowerCase() } 
      });
    } catch (error) {
      this.logger.error('Error finding user by email', { email, error });
      throw error;
    }
  }

  async findById(id: string): Promise<UserEntity | null> {
    try {
      return await this.repository.findOne({ where: { id } });
    } catch (error) {
      this.logger.error('Error finding user by ID', { id, error });
      throw error;
    }
  }

  async create(userData: CreateUserDto): Promise<UserEntity> {
    try {
      // Use UserEntity.create for proper password hashing
      const user = await UserEntity.create(
        userData.email,
        userData.firstName,
        userData.lastName,
        userData.password
      );

      return await this.repository.save(user);
    } catch (error) {
      this.logger.error('Error creating user', { userData, error });
      throw error;
    }
  }

  async update(id: string, updateData: UpdateUserDto): Promise<UserEntity> {
    try {
      const user = await this.findById(id);
      if (!user) {
        throw new Error(`User with ID ${id} not found`);
      }

      // Update only provided fields
      Object.assign(user, updateData);

      return await this.repository.save(user);
    } catch (error) {
      this.logger.error('Error updating user', { id, updateData, error });
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const result = await this.repository.delete(id);
      if (result.affected === 0) {
        throw new Error(`User with ID ${id} not found`);
      }
    } catch (error) {
      this.logger.error('Error deleting user', { id, error });
      throw error;
    }
  }

  /**
   * Saves a user entity to the database
   * @param {UserEntity} user - The user entity to save
   * @returns {Promise<UserEntity>} The saved user entity
   */
  async save(user: UserEntity): Promise<UserEntity> {
    try {
      return await this.repository.save(user);
    } catch (error) {
      this.logger.error('Error saving user', { userId: user.id, error });
      throw error;
    }
  }

  async findByResetToken(token: string): Promise<UserEntity | null> {
    try {
      return await this.repository.findOne({
        where: { resetPasswordToken: token }
      });
    } catch (error) {
      this.logger.error('Error finding user by reset token', { error });
      throw error;
    }
  }

  async updateLastLogin(userId: string): Promise<void> {
    try {
      await this.repository.update(userId, { lastLoginAt: new Date() });
    } catch (error) {
      this.logger.error('Error updating last login', { userId, error });
      throw error;
    }
  }

  async verifyEmail(userId: string): Promise<void> {
    try {
      await this.repository.update(userId, { emailVerified: true });
    } catch (error) {
      this.logger.error('Error verifying email', { userId, error });
      throw error;
    }
  }

  async setResetPasswordToken(userId: string, token: string, expiresInHours: number = 24): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
      await this.repository.update(userId, { 
        resetPasswordToken: token,
        resetPasswordExpires: expiresAt
      });
    } catch (error) {
      this.logger.error('Error setting reset password token', { userId, error });
      throw error;
    }
  }

  async clearResetPasswordToken(userId: string): Promise<void> {
    try {
      await this.repository.update(userId, { 
        resetPasswordToken: null,
        resetPasswordExpires: null
      });
    } catch (error) {
      this.logger.error('Error clearing reset password token', { userId, error });
      throw error;
    }
  }

  async isEmailInUse(email: string, excludeUserId?: string): Promise<boolean> {
    try {
      const queryBuilder = this.repository
        .createQueryBuilder('user')
        .where('user.email = :email', { email: email.toLowerCase() });
      
      if (excludeUserId) {
        queryBuilder.andWhere('user.id != :excludeUserId', { excludeUserId });
      }
      
      const count = await queryBuilder.getCount();
      return count > 0;
    } catch (error) {
      this.logger.error('Error checking email usage', { email, error });
      throw error;
    }
  }

  async findAll(options?: {
    skip?: number;
    take?: number;
    where?: any;
    order?: any;
  }): Promise<UserEntity[]> {
    try {
      const queryBuilder = this.repository.createQueryBuilder('user');
      
      if (options?.where) {
        Object.keys(options.where).forEach(key => {
          queryBuilder.andWhere(`user.${key} = :${key}`, { [key]: options.where[key] });
        });
      }
      
      if (options?.order) {
        Object.keys(options.order).forEach(key => {
          queryBuilder.addOrderBy(`user.${key}`, options.order[key]);
        });
      }
      
      if (options?.skip) {
        queryBuilder.skip(options.skip);
      }
      
      if (options?.take) {
        queryBuilder.take(options.take);
      }
      
      return await queryBuilder.getMany();
    } catch (error) {
      this.logger.error('Error finding users', { error });
      throw error;
    }
  }

  async count(options?: { where?: any }): Promise<number> {
    try {
      const queryBuilder = this.repository.createQueryBuilder('user');
      
      if (options?.where) {
        Object.keys(options.where).forEach(key => {
          queryBuilder.andWhere(`user.${key} = :${key}`, { [key]: options.where[key] });
        });
      }
      
      return await queryBuilder.getCount();
    } catch (error) {
      this.logger.error('Error counting users', { error });
      throw error;
    }
  }
} 