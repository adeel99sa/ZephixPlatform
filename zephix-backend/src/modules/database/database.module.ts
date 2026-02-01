import { Module } from '@nestjs/common';
import { PostgresAdvisoryLockService } from './postgres-advisory-lock.service';
import { DatabaseVerifyService } from './database-verify.service';

@Module({
  providers: [PostgresAdvisoryLockService, DatabaseVerifyService],
  exports: [PostgresAdvisoryLockService, DatabaseVerifyService],
})
export class DatabaseModule {}
