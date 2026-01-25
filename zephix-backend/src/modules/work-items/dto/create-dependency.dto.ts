import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateDependencyDto {
  @IsUUID()
  predecessorId!: string;

  @IsOptional()
  @IsIn(['FS', 'SS', 'FF', 'SF'])
  type?: 'FS' | 'SS' | 'FF' | 'SF';

  @IsOptional()
  @IsInt()
  @Min(-3650)
  @Max(3650)
  lagDays?: number;
}
