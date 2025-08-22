import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ProjectsModule } from './projects/projects.module';
import { HealthModule } from './health/health.module';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    
    ...(process.env.SKIP_DATABASE !== 'true' ? [
      TypeOrmModule.forRootAsync({
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          type: 'postgres',
          url: configService.get('DATABASE_URL'),
          autoLoadEntities: true,
          synchronize: false,
          ssl: configService.get('DB_SSL') === 'require' 
            ? { rejectUnauthorized: false }
            : false,
        }),
        inject: [ConfigService],
      })
    ] : []),
    
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    
    AuthModule,
    OrganizationsModule,
    ProjectsModule,
    HealthModule,
    SharedModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
