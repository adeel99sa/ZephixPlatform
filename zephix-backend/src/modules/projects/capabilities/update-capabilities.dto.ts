import { IsBoolean, IsOptional } from 'class-validator';

// Global ValidationPipe (whitelist:true, forbidNonWhitelisted:true) rejects
// any property not decorated here with a 400 — enforcing the fixed vocabulary.
export class UpdateCapabilitiesDto {
  @IsOptional()
  @IsBoolean()
  use_phases?: boolean;

  @IsOptional()
  @IsBoolean()
  use_iterations?: boolean;

  @IsOptional()
  @IsBoolean()
  use_gates?: boolean;

  @IsOptional()
  @IsBoolean()
  use_wip_limits?: boolean;
}
