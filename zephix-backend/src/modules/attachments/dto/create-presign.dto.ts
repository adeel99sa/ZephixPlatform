import { AttachmentParentType } from '../entities/attachment.entity';

export class CreatePresignDto {
  parentType: AttachmentParentType;
  parentId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}
