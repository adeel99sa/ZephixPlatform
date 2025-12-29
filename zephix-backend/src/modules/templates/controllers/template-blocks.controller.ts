import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { TemplateBlocksService } from '../services/template-blocks.service';
import { TemplateLockGuard } from '../guards/template-lock.guard';
import { BlockRoleGuard } from '../guards/block-role.guard';
import {
  AttachBlockDto,
  ReorderBlocksDto,
  PatchBlockConfigDto,
} from '../dto/template.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplateBlocksController {
  constructor(private readonly blocks: TemplateBlocksService) {}

  @UseGuards(TemplateLockGuard, BlockRoleGuard)
  @Post(':id/blocks')
  async attach(
    @Param('id') templateId: string,
    @Body() dto: AttachBlockDto,
    @Req() req: Request,
  ) {
    return { data: await this.blocks.attachV1(req, templateId, dto) };
  }

  @UseGuards(TemplateLockGuard)
  @Patch(':id/blocks/reorder')
  async reorder(
    @Param('id') templateId: string,
    @Body() dto: ReorderBlocksDto,
    @Req() req: Request,
  ) {
    return {
      data: await this.blocks.reorderV1(req, templateId, { order: dto.items }),
    };
  }

  @UseGuards(TemplateLockGuard)
  @Patch(':id/blocks/:blockId/config')
  async patchConfig(
    @Param('id') templateId: string,
    @Param('blockId') blockId: string,
    @Body() dto: PatchBlockConfigDto,
    @Req() req: Request,
  ) {
    return {
      data: await this.blocks.patchConfigV1(req, templateId, blockId, dto),
    };
  }

  @UseGuards(TemplateLockGuard)
  @Delete(':id/blocks/:blockId')
  async detach(
    @Param('id') templateId: string,
    @Param('blockId') blockId: string,
    @Req() req: Request,
  ) {
    return { data: await this.blocks.detachV1(req, templateId, blockId) };
  }
}
