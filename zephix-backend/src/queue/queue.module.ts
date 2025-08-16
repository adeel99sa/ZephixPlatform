import { Module, Global, OnModuleDestroy } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { QueueService } from './queue.service'
import { WorkerFactory } from './worker.factory'
import { QueueHealthService } from './queue.health'
import { closeAllConnections, isRedisConfigured } from '../config/redis.config'

@Global()
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  providers: [
    QueueService, 
    WorkerFactory, 
    QueueHealthService
  ],
  exports: [QueueService, QueueHealthService]
})
export class QueueModule implements OnModuleDestroy {
  async onModuleDestroy() {
    // Only cleanup Redis connections if Redis is configured
    if (isRedisConfigured()) {
      await closeAllConnections()
    }
  }
}

