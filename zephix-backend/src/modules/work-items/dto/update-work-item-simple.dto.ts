import { PartialType } from '@nestjs/mapped-types';
import { CreateWorkItemSimpleDto } from './create-work-item-simple.dto';

export class UpdateWorkItemSimpleDto extends PartialType(
  CreateWorkItemSimpleDto,
) {}
