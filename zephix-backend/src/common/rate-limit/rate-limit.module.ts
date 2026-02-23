import { Global, Module } from '@nestjs/common';
import { RateLimitStoreService } from './rate-limit-store.service';
import { RateLimiterGuard } from '../guards/rate-limiter.guard';

@Global()
@Module({
  providers: [RateLimitStoreService, RateLimiterGuard],
  exports: [RateLimitStoreService, RateLimiterGuard],
})
export class RateLimitModule {}
