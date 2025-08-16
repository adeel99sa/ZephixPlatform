import { Job } from 'bullmq'
import { Logger } from '@nestjs/common'
import type { RoleSeedPayload } from '../types'
import { Role, RoleType } from '../../projects/entities/role.entity'
import { DataSource } from 'typeorm'

const logger = new Logger('RolesProcessor')

export async function roleSeedProcessor(job: Job<RoleSeedPayload>) {
  const startTime = Date.now()
  const jobId = job.id
  const mode = job.data.mode
  const tenantId = job.data.tenantId || 'N/A'
  const force = job.data.force || false
  
  try {
    logger.log(`Starting role seed job=${jobId} mode=${mode} tenant=${tenantId} force=${force}`)
    
    // Set job timeout to 30 seconds
    const jobTimeout = setTimeout(() => {
      logger.warn(`Role seed job=${jobId} timed out after 30 seconds`)
      job.moveToFailed(new Error('Job timeout after 30 seconds'), '0')
    }, 30000)
    
    try {
      // Get database connection from job context or create new one
      const dataSource = new DataSource({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        entities: [Role],
        synchronize: false,
        logging: false
      })
      
      await dataSource.initialize()
      const roleRepository = dataSource.getRepository(Role)
      
      // Define the roles to seed
      const roles = [
        {
          name: RoleType.ADMIN,
          description: 'Full project administration permissions',
          permissions: ['create', 'read', 'update', 'delete', 'manage_team'],
        },
        {
          name: RoleType.PROJECT_MANAGER,
          description: 'Project management permissions',
          permissions: ['create', 'read', 'update', 'manage_team'],
        },
        {
          name: RoleType.EDITOR,
          description: 'Content editing permissions',
          permissions: ['create', 'read', 'update'],
        },
        {
          name: RoleType.DEVELOPER,
          description: 'Development-focused permissions',
          permissions: ['read', 'update'],
        },
        {
          name: RoleType.ANALYST,
          description: 'Analysis and reporting permissions',
          permissions: ['read', 'update'],
        },
        {
          name: RoleType.VIEWER,
          description: 'Read-only permissions',
          permissions: ['read'],
        },
      ]

      let createdCount = 0
      let skippedCount = 0

      // Update progress
      await job.updateProgress(25)
      
      // Seed roles
      for (const roleData of roles) {
        const existingRole = await roleRepository.findOne({
          where: { name: roleData.name },
        })

        if (!existingRole) {
          const role = roleRepository.create(roleData)
          await roleRepository.save(role)
          createdCount++
          logger.log(`✅ Created role: ${roleData.name}`)
        } else {
          skippedCount++
          logger.log(`⏭️ Role already exists: ${roleData.name}`)
        }
      }
      
      // Update progress
      await job.updateProgress(100)
      
      // Cleanup timeout
      clearTimeout(jobTimeout)
      
      // Close database connection
      await dataSource.destroy()
      
      const duration = Date.now() - startTime
      logger.log(`Role seed completed job=${jobId} mode=${mode} created=${createdCount} skipped=${skippedCount} duration=${duration}ms`)
      
      return { 
        ok: true, 
        created: createdCount,
        skipped: skippedCount,
        duration: `${duration}ms`,
        mode,
        tenantId
      }
      
    } finally {
      // Ensure timeout is cleared
      clearTimeout(jobTimeout)
    }
    
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error(`Role seed failed job=${jobId} mode=${mode} tenant=${tenantId} error=${error.message} duration=${duration}ms`)
    throw error
  }
}

