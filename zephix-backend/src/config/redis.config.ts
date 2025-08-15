import { Logger, OnModuleDestroy } from '@nestjs/common'
import Redis, { RedisOptions } from 'ioredis'

const logger = new Logger('RedisConfig')

export type RedisRole = 'client' | 'subscriber' | 'worker'

// Connection limits for Railway memory constraints
const MAX_CONNECTIONS = 2
let activeConnections = 0

function buildOptions(): string | RedisOptions {
  const url = process.env.REDIS_URL
  if (url && url.trim().length > 0) return url

  const host = process.env.REDIS_HOST || 'localhost'
  const port = Number(process.env.REDIS_PORT || 6379)
  const username = process.env.REDIS_USERNAME || 'default'
  const password = process.env.REDIS_PASSWORD || undefined
  const tls = String(process.env.REDIS_TLS || 'false').toLowerCase() === 'true'

  const opts: RedisOptions = {
    host,
    port,
    username,
    password,
    tls: tls ? {} : undefined,
    lazyConnect: true,
    enableReadyCheck: false,
    maxRetriesPerRequest: 2,
    retryStrategy: (times) => Math.min(1000 * Math.pow(2, times), 15000),
    // Connection pooling limits for Railway
    connectTimeout: 10000,
    commandTimeout: 5000,
    // Connection reuse
    keepAlive: 30000,
    family: 4 // Force IPv4 for Railway
  }

  return opts
}

const shared: Record<RedisRole, Redis | null> = {
  client: null,
  subscriber: null,
  worker: null
}

export async function getRedis(role: RedisRole): Promise<Redis> {
  if (shared[role]) return shared[role] as Redis
  
  // Check connection limits
  if (activeConnections >= MAX_CONNECTIONS) {
    logger.warn(`Connection limit reached (${activeConnections}/${MAX_CONNECTIONS}), reusing existing connection`)
    // Return the first available connection
    const availableConnection = Object.values(shared).find(conn => conn !== null)
    if (availableConnection) return availableConnection
  }
  
  const opts = buildOptions()
  const client = new Redis(opts as any)
  
  client.on('error', (err) => logger.warn(`[${role}] ${err.message}`))
  client.on('connect', () => {
    activeConnections++
    logger.log(`[${role}] Connected (${activeConnections}/${MAX_CONNECTIONS})`)
  })
  client.on('close', () => {
    activeConnections = Math.max(0, activeConnections - 1)
    logger.log(`[${role}] Disconnected (${activeConnections}/${MAX_CONNECTIONS})`)
  })
  
  try {
    await client.connect()
  } catch (e) {
    logger.warn(`[${role}] connect failed, will auto retry in background`)
  }
  
  shared[role] = client
  return client
}

export async function closeAllConnections(): Promise<void> {
  logger.log('Closing all Redis connections...')
  const closePromises = Object.values(shared)
    .filter(conn => conn !== null)
    .map(async (conn) => {
      try {
        await conn?.quit()
        logger.log('Redis connection closed')
      } catch (error) {
        logger.warn('Error closing Redis connection:', error.message)
      }
    })
  
  await Promise.all(closePromises)
  
  // Reset shared connections
  Object.keys(shared).forEach(key => {
    shared[key as RedisRole] = null
  })
  
  activeConnections = 0
  logger.log('All Redis connections closed')
}
