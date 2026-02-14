import { AttachmentParentType } from '../entities/attachment.entity';

export class ListAttachmentsQuery {
  parentType: AttachmentParentType;
  parentId: string;
}
