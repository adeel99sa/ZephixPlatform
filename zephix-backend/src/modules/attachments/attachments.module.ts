import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Attachment } from './entities/attachment.entity';
import { WorkspaceStorageUsage } from '../billing/entities/workspace-storage-usage.entity';
import { StorageService } from './storage/storage.service';
import { AttachmentAccessService } from './services/attachment-access.service';
import { AttachmentsService } from './services/attachments.service';
import { AttachmentsController } from './controllers/attachments.controller';
import { WorkTask } from '../work-management/entities/work-task.entity';
import { WorkspaceAccessModule } from '../workspace-access/workspace-access.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Attachment, WorkTask, WorkspaceStorageUsage]),
    ConfigModule,
    WorkspaceAccessModule,
  ],
  controllers: [AttachmentsController],
  providers: [StorageService, AttachmentAccessService, AttachmentsService],
  exports: [AttachmentsService, StorageService],
})
export class AttachmentsModule {}
