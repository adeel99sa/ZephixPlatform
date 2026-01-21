import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import type { ProjectType } from '../entities/project.entity';

export class CreateProjectSimpleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  name!: string;

  @IsOptional()
  @IsIn(['delivery', 'operations', 'intake'])
  projectType?: ProjectType;
}
