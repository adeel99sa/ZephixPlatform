import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  Req,
  Res,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationValidationGuard } from '../../guards/organization-validation.guard';

@Controller('files')
@UseGuards(JwtAuthGuard, OrganizationValidationGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('tasks/:taskId/attachments')
  @UseInterceptors(FileInterceptor('file'))
  async uploadTaskAttachment(
    @Param('taskId') taskId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      throw new BadRequestException('User organizationId is required but not found in JWT token');
    }

    const uploadedBy = req.user?.id;
    if (!uploadedBy) {
      throw new BadRequestException('User ID is required but not found in JWT token');
    }

    return this.filesService.uploadFile(file, taskId, organizationId, uploadedBy);
  }

  @Get('tasks/:taskId/attachments')
  async getTaskAttachments(@Param('taskId') taskId: string, @Req() req: any) {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      throw new BadRequestException('User organizationId is required but not found in JWT token');
    }

    return this.filesService.getTaskAttachments(taskId, organizationId);
  }

  @Get('attachments/:id')
  async getAttachment(@Param('id') id: string, @Req() req: any) {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      throw new BadRequestException('User organizationId is required but not found in JWT token');
    }

    return this.filesService.getAttachment(id, organizationId);
  }

  @Get('attachments/:id/download')
  async downloadAttachment(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      throw new BadRequestException('User organizationId is required but not found in JWT token');
    }

    const { attachment, stream } = await this.filesService.getAttachmentStream(id, organizationId);

    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.originalName}"`);
    res.setHeader('Content-Length', attachment.size);

    stream.pipe(res);
  }

  @Delete('attachments/:id')
  async deleteAttachment(@Param('id') id: string, @Req() req: any) {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      throw new BadRequestException('User organizationId is required but not found in JWT token');
    }

    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User ID is required but not found in JWT token');
    }

    await this.filesService.deleteAttachment(id, organizationId, userId);
    return { message: 'File attachment deleted successfully' };
  }
}
