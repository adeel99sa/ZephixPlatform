import { IsOptional, IsUUID } from 'class-validator';

export class UpdateDocumentAssigneesDto {
  @IsOptional()
  @IsUUID()
  ownerUserId?: string;

  @IsOptional()
  @IsUUID()
  reviewerUserId?: string;
}
