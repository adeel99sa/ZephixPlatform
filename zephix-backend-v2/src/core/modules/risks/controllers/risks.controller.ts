import { Controller, Post, Get, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RiskDetectionService } from '../services/risk-detection.service';

@ApiTags('risks')
@Controller('api/v1/risks')
@UseGuards(JwtAuthGuard)
export class RisksController {
  constructor(private readonly riskService: RiskDetectionService) {}

  @Post('scan/:projectId')
  @ApiOperation({ summary: 'Scan project for risks' })
  async scanProject(@Param('projectId') projectId: string, @Req() req) {
    // Service only needs projectId - we fixed the service earlier to not use organizationId
    return this.riskService.scanProject(projectId);
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get risks by project' })
  async getRisksByProject(@Param('projectId') projectId: string, @Req() req) {
    // Service only needs projectId
    return this.riskService.getRisksByProject(projectId);
  }
}
