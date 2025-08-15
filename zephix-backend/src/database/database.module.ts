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

        return {
          type: 'postgres',
          url: databaseUrl,
          autoLoadEntities: true,
          synchronize: false,
          logging,
          ssl: isProd ? { rejectUnauthorized: false } : false,
          migrationsTransactionMode: 'each',
          migrations: [__dirname + '/migrations/*.{ts,js}'],
          extra: {
            max: 10,
            idleTimeoutMillis: 60000,
            connectionTimeoutMillis: 60000,
            keepAlive: true,
            keepAliveInitialDelayMillis: 10000
          }
        }
      }
    })
  ]
})
export class DatabaseModule {}
