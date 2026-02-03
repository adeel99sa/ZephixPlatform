import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ApplyTemplateDto {
  @IsString()
  templateKey: string;

  @IsOptional()
  @IsString()
  version?: string; // optional version number

  @IsOptional()
  options?: {
    enforceRequired?: boolean;
    mode?: 'create_missing_only' | 'full'; // default create_missing_only
  };
}
