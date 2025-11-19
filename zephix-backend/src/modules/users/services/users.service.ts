import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findByOrganization(organizationId: string): Promise<User[]> {
    return this.userRepository.find({
      where: { organizationId, isActive: true },
      select: ['id', 'email', 'firstName', 'lastName'],
      order: { firstName: 'ASC' },
    });
  }
}
