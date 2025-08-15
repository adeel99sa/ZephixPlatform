import { Injectable, Logger } from '@nestjs/common'
import { getRedis } from '../config/redis.config'
import { Queue } from 'bullmq'
import { QUEUE_NAMES } from './constants'
import { WorkerFactory } from './worker.factory'

@Injectable()
export class QueueHealthService {
  private readonly logger = new Logger(QueueHealthService.name)
  private metrics = {
    totalJobsProcessed: 0,
    totalJobsFailed: 0,
    lastHealthCheck: new Date(),
    uptime: process.uptime()
  }

  constructor(private readonly workerFactory: WorkerFactory) {}

  async check() {
    const startTime = Date.now()
    
    try {
      // Check Redis connection
      const redis = await getRedis('client')
      const ping = await redis.ping().catch(() => 'fail')
      
      // Get memory usage
      const memoryUsage = process.memoryUsage()
      const memoryMB = {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024)
      }

      // Check if memory usage is high
      const memoryStatus = memoryMB.heapUsed > 512 ? 'high' : 'normal'

      const details: Record<string, any> = { 
        redisPing: ping,
        memory: memoryMB,
        memoryStatus,
        workerStatus: this.workerFactory.getWorkerStatus(),
        metrics: this.metrics
      }

      // Get queue statistics with error handling
      for (const name of Object.values(QUEUE_NAMES)) {
        try {
          const q = new Queue(name, { connection: redis })
          const counts = await q.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed')
          
          // Update metrics
          if (counts.completed) {
            this.metrics.totalJobsProcessed += counts.completed
          }
          if (counts.failed) {
            this.metrics.totalJobsFailed += counts.failed
          }
          
          details[name] = counts
          
          // Check for stalled jobs (memory leak indicator)
          if (counts.active > 0) {
            const activeJobs = await q.getJobs(['active'], 0, 10)
            const stalledJobs = activeJobs.filter(job => {
              const age = Date.now() - job.processedOn
              return age > 300000 // 5 minutes
            })
            
            if (stalledJobs.length > 0) {
              details[`${name}_stalled`] = stalledJobs.length
              this.logger.warn(`Queue ${name} has ${stalledJobs.length} stalled jobs`)
            }
          }
          
          await q.close()
        } catch (error) {
          details[name] = `error: ${error.message}`
          this.logger.warn(`Error checking queue ${name}: ${error.message}`)
        }
      }

      // Update metrics
      this.metrics.lastHealthCheck = new Date()
      this.metrics.uptime = process.uptime()

      const responseTime = Date.now() - startTime
      const status = ping === 'PONG' && memoryStatus !== 'high' ? 'up' : 'degraded'

      return { 
        status, 
        details,
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      }
      
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`)
      return { 
        status: 'down', 
        details: { error: error.message },
        timestamp: new Date().toISOString()
      }
    }
  }

  // Method to update metrics from job completion
  recordJobCompletion(success: boolean) {
    if (success) {
      this.metrics.totalJobsProcessed++
    } else {
      this.metrics.totalJobsFailed++
    }
  }

  // Get current metrics
  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalJobsProcessed > 0 
        ? ((this.metrics.totalJobsProcessed - this.metrics.totalJobsFailed) / this.metrics.totalJobsProcessed * 100).toFixed(2)
        : 0
    }
  }
}

