import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { Worker, QueueEvents } from 'bullmq'
import { getRedis, isRedisConfigured } from '../config/redis.config'
import { QUEUE_NAMES } from './constants'
import { roleSeedProcessor } from './processors/roles.processor'
import { fileProcessor } from './processors/files.processor'
import { llmProcessor } from './processors/llm.processor'
import { emailProcessor } from './processors/email.processor'

@Injectable()
export class WorkerFactory implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkerFactory.name)
  private workers: Worker[] = []
  private queueEvents: QueueEvents[] = []

  async onModuleInit() {
    // Only start workers if Redis is configured
    if (!isRedisConfigured()) {
      this.logger.log('Redis not configured, workers will not start')
      return
    }

    try {
      await this.startWorkers()
    } catch (e) {
      this.logger.warn(`Worker bootstrap failed, background retry will continue: ${e.message}`)
    }
  }

  async onModuleDestroy() {
    await this.stopAllWorkers()
  }

  private async startWorkers() {
    // Double-check Redis availability
    if (!isRedisConfigured()) {
      this.logger.log('Redis not configured, skipping worker startup')
      return
    }

    const connection = await getRedis('worker')
    if (!connection) {
      this.logger.warn('Redis connection failed, workers will not start')
      return
    }
    
    // Memory protection: LLM queue limited to 1 concurrent job
    const baseConfig = { connection, concurrency: 2 }
    const llmConfig = { connection, concurrency: 1 } // High memory operations

    // Create workers with memory-optimized settings
    const roles = new Worker(QUEUE_NAMES.ROLES, roleSeedProcessor, baseConfig)
    const files = new Worker(QUEUE_NAMES.FILES, fileProcessor, baseConfig)
    const llm = new Worker(QUEUE_NAMES.LLM, llmProcessor, llmConfig)
    const email = new Worker(QUEUE_NAMES.EMAIL, emailProcessor, baseConfig)

    this.workers = [roles, files, llm, email]

    // Set up event handlers with structured logging
    this.workers.forEach((worker) => {
      worker.on('error', (err) => 
        this.logger.warn(`Worker ${worker.name} error: ${err.message}`)
      )
      
      worker.on('failed', (job, err) => 
        this.logger.warn(`Worker ${worker.name} failed job=${job?.id} error=${err.message}`)
      )
      
      worker.on('completed', (job) => 
        this.logger.log(`Worker ${worker.name} completed job=${job?.id}`)
      )

      // Memory monitoring
      worker.on('stalled', (jobId) => 
        this.logger.warn(`Worker ${worker.name} stalled job=${jobId}`)
      )
    })

    // Set up queue events for monitoring
    const subscriberConnection = await getRedis('subscriber')
    if (subscriberConnection) {
      const events = new QueueEvents(QUEUE_NAMES.FILES, { connection: subscriberConnection })
      
      events.on('waiting', ({ jobId }) => 
        this.logger.log(`Files queue waiting job=${jobId}`)
      )
      
      events.on('stalled', ({ jobId }) => 
        this.logger.warn(`Files queue stalled job=${jobId}`)
      )

      this.queueEvents = [events]
    }

    this.logger.log(`Started ${this.workers.length} workers with memory protection`)
  }

  private async stopAllWorkers(): Promise<void> {
    if (this.workers.length === 0) {
      this.logger.debug('No workers to stop')
      return
    }
    
    this.logger.log('Stopping all workers...')
    
    // Close all workers
    const workerPromises = this.workers.map(async (worker) => {
      try {
        await worker.close()
        this.logger.log(`Worker ${worker.name} stopped`)
      } catch (error) {
        this.logger.warn(`Error stopping worker ${worker.name}: ${error.message}`)
      }
    })

    // Close all queue events
    const eventPromises = this.queueEvents.map(async (events) => {
      try {
        await events.close()
        this.logger.log('Queue events closed')
      } catch (error) {
        this.logger.warn(`Error closing queue events: ${error.message}`)
      }
    })

    await Promise.all([...workerPromises, ...eventPromises])
    
    this.workers = []
    this.queueEvents = []
    
    this.logger.log('All workers stopped')
  }

  // Health check method
  getWorkerStatus() {
    if (!isRedisConfigured()) {
      return {
        status: 'Redis not configured',
        totalWorkers: 0,
        activeWorkers: 0,
        workerNames: []
      }
    }

    return {
      status: 'Redis configured',
      totalWorkers: this.workers.length,
      activeWorkers: this.workers.filter(w => w.isRunning()).length,
      workerNames: this.workers.map(w => w.name)
    }
  }

  // Check if Redis is available
  isRedisAvailable(): boolean {
    return isRedisConfigured()
  }
}

