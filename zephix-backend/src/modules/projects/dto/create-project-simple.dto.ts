import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProjectSimpleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  name!: string;

  @IsOptional()
  @IsIn(['delivery', 'operations', 'intake'])
  projectType?: string;
}
