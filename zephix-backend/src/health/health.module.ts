import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { HealthController } from './health.controller';
import { User } from '../modules/users/entities/user.entity';

@Module({
  imports: [
    ConfigModule,
    JwtModule,
    // Only import TypeORM when database is available
    ...(process.env.SKIP_DATABASE !== 'true'
      ? [TypeOrmModule.forFeature([User])]
      : []),
  ],
  controllers: [HealthController],
  providers: [],
  exports: [],
})
export class HealthModule {}
