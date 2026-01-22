import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateDocDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;
}
