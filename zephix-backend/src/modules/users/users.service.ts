import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @Optional() @InjectRepository(User)
    private userRepository?: Repository<User>,
  ) {}

  private checkDatabaseAvailability() {
    if (!this.userRepository) {
      throw new Error('Users service temporarily unavailable. Database not configured.');
    }
  }

  async findById(id: string): Promise<User | null> {
    this.checkDatabaseAvailability();
    return this.userRepository!.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    this.checkDatabaseAvailability();
    return this.userRepository!.findOne({
      where: { email: email.toLowerCase() },
    });
  }

  async create(userData: Partial<User>): Promise<User> {
    this.checkDatabaseAvailability();
    const user = this.userRepository!.create(userData);
    return this.userRepository!.save(user);
  }

  async update(id: string, userData: Partial<User>): Promise<User | null> {
    this.checkDatabaseAvailability();
    await this.userRepository!.update(id, userData);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    this.checkDatabaseAvailability();
    const result = await this.userRepository!.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
