export type LockState = 'UNLOCKED' | 'LOCKED';

export class TemplateListQueryDto {
  isDefault?: string;
  isSystem?: string;
  lockState?: LockState;
  includeBlocks?: string;
}

export class CreateTemplateDto {
  name: string;
  description?: string;
  category?: string;
  kind?: 'project' | 'board' | 'mixed';
  icon?: string;
  metadata?: any;
}

export class UpdateTemplateDto {
  name?: string;
  description?: string;
  category?: string;
  icon?: string;
  metadata?: any;
}

export class CloneTemplateDto {
  name?: string;
}

export class AttachBlockDto {
  blockId: string;
  enabled?: boolean;
  displayOrder?: number;
  config?: any;
  locked?: boolean;
}

export class ReorderBlocksDto {
  items: Array<{ blockId: string; displayOrder: number }>;
}

export class PatchBlockConfigDto {
  config: any;
}
