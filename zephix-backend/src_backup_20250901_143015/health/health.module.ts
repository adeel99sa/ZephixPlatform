import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { User } from '../modules/users/entities/user.entity';

@Module({
  imports: [
    // Only import TypeORM when database is available
    ...(process.env.SKIP_DATABASE !== 'true'
      ? [TypeOrmModule.forFeature([User])]
      : []),
  ],
  controllers: [HealthController],
  exports: [],
})
export class HealthModule {}
