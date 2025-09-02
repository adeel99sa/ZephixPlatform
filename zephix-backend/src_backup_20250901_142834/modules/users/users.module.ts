import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserSettings } from './entities/user-settings.entity';

@Module({
  imports: [
    ...(process.env.SKIP_DATABASE !== 'true'
      ? [TypeOrmModule.forFeature([User, UserSettings])]
      : []),
  ],
  controllers: [], // Remove broken controller references
  providers: [UsersService], // Keep only working service
  exports: [UsersService],
})
export class UsersModule {}
