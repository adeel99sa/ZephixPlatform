import { Module, Global, OnModuleDestroy } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { QueueService } from './queue.service'
import { WorkerFactory } from './worker.factory'
import { QueueHealthService } from './queue.health'
import { closeAllConnections } from '../config/redis.config'

@Global()
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  providers: [QueueService, WorkerFactory, QueueHealthService],
  exports: [QueueService, QueueHealthService]
})
export class QueueModule implements OnModuleDestroy {
  async onModuleDestroy() {
    // Cleanup all Redis connections and queues
    await closeAllConnections()
  }
}

