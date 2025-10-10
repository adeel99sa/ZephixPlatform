import { Controller, Get, Post, Delete, Param, Body, Request, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../organizations/guards/roles.guard';
import { Roles } from '../../organizations/decorators/roles.decorator';
import { TrashService } from './trash.service';

@Controller('trash')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TrashController {
  constructor(private trashService: TrashService) {}

  @Get()
  @Roles('admin')
  async getTrash(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const skip = (pageNum - 1) * limitNum;
    
    return this.trashService.getTrashItems(
      req.user.organizationId, 
      skip, 
      limitNum
    );
  }

  @Get('stats')
  @Roles('admin')
  async getTrashStats(@Request() req) {
    return this.trashService.getTrashStats(req.user.organizationId);
  }

  @Post('restore')
  @Roles('admin')
  async restore(
    @Body() dto: { itemType: string; id: string },
    @Request() req
  ) {
    await this.trashService.restoreItem(
      dto.itemType,
      dto.id,
      req.user.organizationId
    );
    return { success: true, message: 'Item restored successfully' };
  }

  @Post('bulk-restore')
  @Roles('admin')
  async bulkRestore(
    @Body() dto: { items: Array<{ itemType: string; id: string }> },
    @Request() req
  ) {
    const results = [];
    for (const item of dto.items) {
      try {
        await this.trashService.restoreItem(
          item.itemType,
          item.id,
          req.user.organizationId
        );
        results.push({ id: item.id, success: true });
      } catch (error) {
        results.push({ id: item.id, success: false, error: error.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    return { 
      success: true, 
      message: `${successCount}/${dto.items.length} items restored successfully`,
      results
    };
  }

  @Delete('permanent/:itemType/:id')
  @Roles('admin')
  async permanentDelete(
    @Param('itemType') itemType: string,
    @Param('id') id: string,
    @Request() req
  ) {
    await this.trashService.permanentDelete(
      itemType,
      id,
      req.user.organizationId
    );
    return { success: true, message: 'Item permanently deleted' };
  }

  @Delete('empty')
  @Roles('admin')
  async emptyTrash(@Request() req) {
    const count = await this.trashService.emptyTrash(req.user.organizationId);
    return { success: true, message: `${count} items permanently deleted` };
  }
}
