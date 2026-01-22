import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateFormDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  schema?: any;
}
