import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { LegoBlocksService } from '../services/lego-blocks.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('lego-blocks')
@UseGuards(JwtAuthGuard)
export class LegoBlocksController {
  constructor(private readonly blocks: LegoBlocksService) {}

  @Get()
  async list(
    @Query('type') type: string | undefined,
    @Query('category') category: string | undefined,
    @Query('isActive') isActive: string | undefined,
    @Req() req: Request,
  ) {
    const params = {
      type,
      category,
      isActive:
        isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    };
    return { data: await this.blocks.listV1(req, params) };
  }
}
