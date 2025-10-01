import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileAttachment } from './entities/file-attachment.entity';
import { Task } from '../tasks/entities/task.entity';
import { promises as fs } from 'fs';
import { join } from 'path';

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(FileAttachment)
    private fileAttachmentRepository: Repository<FileAttachment>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    taskId: string,
    organizationId: string,
    uploadedBy: string,
  ): Promise<FileAttachment> {
    // Verify task exists and belongs to organization
    const task = await this.taskRepository.findOne({
      where: { id: taskId, organizationId },
    });

    if (!task) {
      throw new NotFoundException('Task not found or access denied');
    }

    // Create file attachment record
    const fileAttachment = this.fileAttachmentRepository.create({
      taskId,
      projectId: task.projectId,
      organizationId,
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path,
      uploadedBy,
    });

    return this.fileAttachmentRepository.save(fileAttachment);
  }

  async getTaskAttachments(taskId: string, organizationId: string): Promise<FileAttachment[]> {
    // Verify task exists and belongs to organization
    const task = await this.taskRepository.findOne({
      where: { id: taskId, organizationId },
    });

    if (!task) {
      throw new NotFoundException('Task not found or access denied');
    }

    return this.fileAttachmentRepository.find({
      where: { taskId, organizationId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async deleteAttachment(attachmentId: string, organizationId: string, userId: string): Promise<void> {
    const attachment = await this.fileAttachmentRepository.findOne({
      where: { id: attachmentId, organizationId },
    });

    if (!attachment) {
      throw new NotFoundException('File attachment not found or access denied');
    }

    // Soft delete - mark as inactive
    attachment.isActive = false;
    await this.fileAttachmentRepository.save(attachment);

    // Optionally delete the physical file
    try {
      await fs.unlink(attachment.path);
    } catch (error) {
      console.warn('Failed to delete physical file:', error);
    }
  }

  async getAttachment(attachmentId: string, organizationId: string): Promise<FileAttachment> {
    const attachment = await this.fileAttachmentRepository.findOne({
      where: { id: attachmentId, organizationId, isActive: true },
    });

    if (!attachment) {
      throw new NotFoundException('File attachment not found or access denied');
    }

    return attachment;
  }

  async getAttachmentStream(attachmentId: string, organizationId: string): Promise<{ attachment: FileAttachment; stream: NodeJS.ReadableStream }> {
    const attachment = await this.getAttachment(attachmentId, organizationId);

    try {
      const stream = require('fs').createReadStream(attachment.path);
      return { attachment, stream };
    } catch (error) {
      throw new BadRequestException('File not found on disk');
    }
  }
}
