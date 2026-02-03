import { IsObject, IsOptional, IsString } from 'class-validator';

export class GateDecideDto {
  @IsString()
  decision: 'approved' | 'approved_with_comments' | 'rejected';

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsObject()
  evidence?: { links?: string[]; files?: string[] };
}
