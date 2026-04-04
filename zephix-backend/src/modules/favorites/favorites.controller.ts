import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FavoritesService } from './favorites.service';
import { FavoriteItemType } from './entities/favorite.entity';

const VALID_ITEM_TYPES: FavoriteItemType[] = ['workspace', 'project', 'dashboard'];

@ApiTags('favorites')
@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: 'List all favorites for the current user' })
  @ApiResponse({ status: 200, description: 'List of favorited items' })
  async list(@CurrentUser() user: any) {
    const favorites = await this.favoritesService.listFavorites(
      user.id,
      user.organizationId,
    );
    return { favorites };
  }

  @Post()
  @ApiOperation({ summary: 'Add an item to favorites' })
  @ApiResponse({ status: 201, description: 'Item favorited' })
  async add(
    @CurrentUser() user: any,
    @Body() body: { itemType: FavoriteItemType; itemId: string },
  ) {
    if (!body.itemType || !body.itemId) {
      throw new BadRequestException('itemType and itemId are required');
    }
    if (!VALID_ITEM_TYPES.includes(body.itemType)) {
      throw new BadRequestException(
        `itemType must be one of: ${VALID_ITEM_TYPES.join(', ')}`,
      );
    }

    const favorite = await this.favoritesService.addFavorite(
      user.id,
      user.organizationId,
      body.itemType,
      body.itemId,
    );
    return { favorite };
  }

  @Delete()
  @ApiOperation({ summary: 'Remove an item from favorites' })
  @ApiResponse({ status: 200, description: 'Item unfavorited' })
  async remove(
    @CurrentUser() user: any,
    @Query('itemType') itemType: FavoriteItemType,
    @Query('itemId') itemId: string,
  ) {
    if (!itemType || !itemId) {
      throw new BadRequestException('itemType and itemId query params are required');
    }

    await this.favoritesService.removeFavorite(user.id, itemType, itemId);
    return { success: true };
  }
}
