import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ResourceHeatMapService } from './services/resource-heat-map.service';
import { HeatMapQueryDto } from './dto/heat-map-query.dto';

@Controller('resources')
@UseGuards(JwtAuthGuard)
export class ResourcesController {
  constructor(
    private readonly heatMapService: ResourceHeatMapService,
  ) {}

  @Get('heat-map')
  async getResourceHeatMap(@Query() query: HeatMapQueryDto) {
    return this.heatMapService.getHeatMapData(query);
  }
}
