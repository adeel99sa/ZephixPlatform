import { IsObject, IsOptional, IsString } from 'class-validator';

export class DocumentTransitionDto {
  @IsString()
  action:
    | 'start_draft'
    | 'submit_for_review'
    | 'approve'
    | 'request_changes'
    | 'mark_complete'
    | 'create_new_version';

  @IsOptional()
  @IsString()
  changeSummary?: string;

  @IsOptional()
  @IsObject()
  content?: Record<string, any>;

  @IsOptional()
  @IsString()
  externalUrl?: string;

  @IsOptional()
  @IsString()
  fileStorageKey?: string;
}
