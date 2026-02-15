import { IsOptional, IsString, MaxLength } from 'class-validator';

export class TransitionChangeRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
