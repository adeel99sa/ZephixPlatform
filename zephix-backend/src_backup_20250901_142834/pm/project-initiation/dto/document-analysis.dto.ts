import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class DocumentAnalysisDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsObject()
  @IsOptional()
  organizationContext?: any;
}
