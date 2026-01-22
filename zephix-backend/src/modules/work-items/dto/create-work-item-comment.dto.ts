import { IsString, MaxLength } from 'class-validator';

export class CreateWorkItemCommentDto {
  @IsString()
  @MaxLength(5000)
  body: string;
}
