import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { QUEUE_NAMES } from '../constants/queue.constants';

/**
 * Wave 10: Creates and manages BullMQ queues.
 * One shared Redis connection per environment.
 * Three queues: kpi-recompute, kpi-rollup, kpi-scheduler.
 */
@Injectable()
export class KpiQueueFactoryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KpiQueueFactoryService.name);
  private connection: IORedis | null = null;
  private queues = new Map<string, Queue>();
  private queueEvents = new Map<string, QueueEvents>();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const redisUrl = this.configService.get<string>('redis.url') || 'redis://localhost:6379';
    const redisDb = this.configService.get<number>('redis.db') || 0;

    try {
      this.connection = new IORedis(redisUrl, {
        db: redisDb,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        lazyConnect: true,
      });
      await this.connection.connect();
      this.logger.log(`Redis connected for KPI queues: ${redisUrl.replace(/\/\/.*@/, '//<redacted>@')}`);
    } catch (err) {
      this.logger.warn(`Redis unavailable for KPI queues — running in no-op mode: ${err}`);
      this.connection = null;
      return;
    }

    for (const name of Object.values(QUEUE_NAMES)) {
      const queue = new Queue(name, { connection: this.connection.duplicate() });
      this.queues.set(name, queue);
      this.logger.log(`Queue created: ${name}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    for (const [name, qe] of this.queueEvents) {
      await qe.close().catch(() => {});
    }
    for (const [name, q] of this.queues) {
      await q.close().catch(() => {});
    }
    if (this.connection) {
      await this.connection.quit().catch(() => {});
    }
    this.logger.log('KPI queues shut down');
  }

  getQueue(name: string): Queue | null {
    return this.queues.get(name) ?? null;
  }

  getConnection(): IORedis | null {
    return this.connection;
  }

  isConnected(): boolean {
    return this.connection !== null && this.connection.status === 'ready';
  }
}
