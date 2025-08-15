import { Job } from 'bullmq'
import { Logger } from '@nestjs/common'
import type { EmailPayload } from '../types'

const logger = new Logger('EmailProcessor')

export async function emailProcessor(job: Job<EmailPayload>) {
  const startTime = Date.now()
  const jobId = job.id
  const emailTo = job.data.to
  
  try {
    logger.log(`Starting email send job=${jobId} to=${emailTo} subject=${job.data.subject}`)
    
    // TODO call your email provider here
    const duration = Date.now() - startTime
    logger.log(`Email send completed job=${jobId} to=${emailTo} duration=${duration}ms`)
    
    return { sent: true, duration: `${duration}ms` }
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error(`Email send failed job=${jobId} to=${emailTo} error=${error.message} duration=${duration}ms`)
    throw error
  }
}

