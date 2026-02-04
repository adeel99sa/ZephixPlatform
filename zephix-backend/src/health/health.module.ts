import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { User } from '../modules/users/entities/user.entity';
import { DatabaseModule } from '../modules/database/database.module';

@Module({
  imports: [
    // Only import TypeORM when database is available
    ...(process.env.SKIP_DATABASE !== 'true'
      ? [TypeOrmModule.forFeature([User])]
      : []),
    // Import DatabaseModule to enable schema verification in health checks
    ...(process.env.SKIP_DATABASE !== 'true' ? [DatabaseModule] : []),
  ],
  controllers: [HealthController],
  providers: [],
  exports: [],
})
export class HealthModule {}
