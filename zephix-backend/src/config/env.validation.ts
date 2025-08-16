import { plainToClass, Transform } from 'class-transformer';
import { IsString, IsNumber, IsOptional, IsBoolean, validateSync } from 'class-validator';

export class EnvironmentVariables {
  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  PORT: number = 3000;

  @IsString()
  NODE_ENV: string = 'development';

  @IsString()
  @IsOptional()
  DATABASE_URL?: string;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  ANTHROPIC_API_KEY?: string;

  @IsString()
  @IsOptional()
  FRONTEND_URL?: string;

  @IsString()
  @IsOptional()
  BACKEND_URL?: string;

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  @IsOptional()
  SKIP_DATABASE?: boolean;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN?: string = '15m';

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN?: string = '7d';

  // Computed properties for service availability
  get isDatabaseEnabled(): boolean {
    return !!this.DATABASE_URL && !this.SKIP_DATABASE;
  }

  get isAIEnabled(): boolean {
    return !!this.ANTHROPIC_API_KEY;
  }

  get isProduction(): boolean {
    return this.NODE_ENV === 'production';
  }

  get isDevelopment(): boolean {
    return this.NODE_ENV === 'development';
  }
}

export function validateEnvironment(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToClass(EnvironmentVariables, config);
  const errors = validateSync(validatedConfig, { 
    skipMissingProperties: false,
    forbidNonWhitelisted: true,
    whitelist: true
  });

  if (errors.length > 0) {
    const errorMessages = errors.map(error => 
      `${error.property}: ${Object.values(error.constraints || {}).join(', ')}`
    ).join('; ');
    
    throw new Error(`Configuration validation error: ${errorMessages}`);
  }
  
  return validatedConfig;
}
