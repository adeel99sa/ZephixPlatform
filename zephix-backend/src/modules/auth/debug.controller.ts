import { Controller, Get, Post, Body } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';

@Controller('debug')
export class DebugController {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  @Get('test-db')
  async testDatabase() {
    try {
      const user = await this.userRepository.findOne({
        where: { email: 'adeel99sa@yahoo.com' }
      });
      
      return {
        success: true,
        user: user ? {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isActive: user.isActive
        } : null
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  }

  @Post('test-password')
  async testPassword(@Body() body: { password: string }) {
    try {
      const user = await this.userRepository.findOne({
        where: { email: 'adeel99sa@yahoo.com' }
      });
      
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      const isPasswordValid = await bcrypt.compare(body.password, user.password);
      
      return {
        success: true,
        passwordValid: isPasswordValid,
        userPassword: user.password.substring(0, 20) + '...'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  }
}








