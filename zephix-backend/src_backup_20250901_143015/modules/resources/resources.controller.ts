import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResourceHeatMapService } from './services/resource-heat-map.service';
import { HeatMapQueryDto } from './dto/heat-map-query.dto';

@Controller('resources')
@ApiTags('resources')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ResourcesController {
  constructor(private readonly heatMapService: ResourceHeatMapService) {}

  @Get('heat-map')
  @ApiOperation({ summary: 'Get resource allocation heat map data' })
  @ApiResponse({
    status: 200,
    description: 'Heat map data retrieved successfully',
  })
  async getResourceHeatMap(@Query() query: HeatMapQueryDto) {
    return this.heatMapService.getHeatMapData(query);
  }

  @Get('test')
  @ApiOperation({ summary: 'Test endpoint for resources module' })
  @ApiResponse({ status: 200, description: 'Resources module is working' })
  async test() {
    return { message: 'Resources module is working!', timestamp: new Date() };
  }
}
