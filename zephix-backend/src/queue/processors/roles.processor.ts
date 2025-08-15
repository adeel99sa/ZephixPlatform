import { Job } from 'bullmq'
import { Logger } from '@nestjs/common'
import type { RoleSeedPayload } from '../types'

const logger = new Logger('RolesProcessor')

export async function roleSeedProcessor(job: Job<RoleSeedPayload>) {
  const startTime = Date.now()
  const jobId = job.id
  const tenantId = job.data.tenantId
  
  try {
    logger.log(`Starting role seed job=${jobId} tenant=${tenantId} force=${job.data.force}`)
    
    // TODO call your real role seeding service here
    await job.updateProgress(25)
    await new Promise((r) => setTimeout(r, 200))
    await job.updateProgress(100)
    
    const duration = Date.now() - startTime
    logger.log(`Role seed completed job=${jobId} tenant=${tenantId} duration=${duration}ms`)
    
    return { ok: true, duration: `${duration}ms` }
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error(`Role seed failed job=${jobId} tenant=${tenantId} error=${error.message} duration=${duration}ms`)
    throw error
  }
}

