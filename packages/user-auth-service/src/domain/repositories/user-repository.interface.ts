import { UserEntity } from '../entities/user.entity';
import { CreateUserDto, UpdateUserDto } from '../../application/dto/auth.dto';

export interface IUserRepository {
  findByEmail(email: string): Promise<UserEntity | null>;
  findById(id: string): Promise<UserEntity | null>;
  findByResetToken(token: string): Promise<UserEntity | null>;
  create(userData: CreateUserDto): Promise<UserEntity>;
  update(id: string, data: UpdateUserDto): Promise<UserEntity>;
  save(user: UserEntity): Promise<UserEntity>;
  delete(id: string): Promise<void>;
} 