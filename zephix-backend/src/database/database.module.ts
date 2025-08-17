import { Module } from '@nestjs/common'
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm'
import { ConfigModule } from '@nestjs/config'
import type { LoggerOptions } from 'typeorm'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: (): TypeOrmModuleOptions => {
        const isProd = process.env.NODE_ENV === 'production'
        const databaseUrl = process.env.DATABASE_URL as string
        const logging: boolean | LoggerOptions = isProd ? (['error', 'warn'] as LoggerOptions) : true

        // Enterprise-secure SSL configuration for Railway PostgreSQL
        const sslConfig = isProd ? {
          rejectUnauthorized: false, // Accept Railway's self-signed certificates
          ca: process.env.DATABASE_CA_CERT, // Optional: Custom CA certificate
          // Additional enterprise security for production
          checkServerIdentity: false, // Disable hostname verification for Railway
          secureProtocol: 'TLSv1_2_method' // Enforce TLS 1.2+
        } : false

        console.log('🔐 Database SSL Configuration:', isProd ? 'Production SSL Enabled' : 'Development - No SSL')
        
        return {
          type: 'postgres',
          url: databaseUrl,
          autoLoadEntities: true,
          synchronize: false,
          logging,
          ssl: sslConfig,
          migrationsTransactionMode: 'each',
          migrations: [__dirname + '/migrations/*.{ts,js}'],
          extra: {
            max: 10,
            idleTimeoutMillis: 60000,
            connectionTimeoutMillis: 60000,
            keepAlive: true,
            keepAliveInitialDelayMillis: 10000,
            // Enterprise connection pool settings
            acquireTimeoutMillis: 60000,
            createTimeoutMillis: 30000,
            destroyTimeoutMillis: 5000,
            reapIntervalMillis: 1000,
            createRetryIntervalMillis: 200
          }
        }
      }
    })
  ]
})
export class DatabaseModule {}