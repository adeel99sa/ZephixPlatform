import { Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MigrationRunnerService } from './migration-runner.service';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => {
        const isProduction = process.env.NODE_ENV === 'production';
        const databaseUrl = process.env.DATABASE_URL;

        return {
          type: 'postgres',
          url: databaseUrl,
          autoLoadEntities: true,
          synchronize: false,
          // Railway-specific optimizations
          extra: {
            max: 10,
            min: 2,
            acquire: 60000,
            idle: 10000,
            family: 4, // Force IPv4 for Railway
            connectionLimit: 10,
            acquireTimeout: 60000,
            timeout: 60000,
            keepAlive: true,
            keepAliveInitialDelay: 30000,
          },
          retryAttempts: 15,
          retryDelay: 5000,
          connectTimeoutMS: 60000,
          acquireTimeoutMillis: 60000,
          keepConnectionAlive: true,
          ssl: isProduction ? true : false,
          logging: isProduction ? ['error', 'warn'] : true,
          migrationsTransactionMode: 'each',
          // Migration configuration
          migrations: [__dirname + '/migrations/*.{ts,js}'],
          migrationsRun: false,
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [MigrationRunnerService],
  exports: [MigrationRunnerService],
})
export class DatabaseModule {}