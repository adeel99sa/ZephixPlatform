import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Header,
  StreamableFile,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { OrganizationGuard } from '../../organizations/guards/organization.guard';
import { CurrentOrg } from '../../organizations/decorators/current-org.decorator';
import { ProjectsService } from '../services/projects.service';
import { CreateExportScheduleDto } from '../dto/create-export-schedule.dto';

@ApiTags('projects-export')
@ApiBearerAuth('JWT-auth')
@Controller('pm/projects')
@UseGuards(AuthGuard('jwt'), OrganizationGuard)
export class ProjectExportController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get(':id/export/pdf')
  @ApiOperation({ summary: 'Export project data as PDF' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'PDF file stream' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="project-report.pdf"')
  async exportToPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @CurrentOrg() orgId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const pdfBuffer = await this.projectsService.exportToPdf(id, user.id, orgId);
    return new StreamableFile(pdfBuffer);
  }

  @Get(':id/export/excel')
  @ApiOperation({ summary: 'Export project data as Excel' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Excel file stream' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Disposition', 'attachment; filename="project-report.xlsx"')
  async exportToExcel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @CurrentOrg() orgId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const excelBuffer = await this.projectsService.exportToExcel(id, user.id, orgId);
    return new StreamableFile(excelBuffer);
  }

  @Get(':id/export/csv')
  @ApiOperation({ summary: 'Export project data as CSV' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'CSV file stream' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="project-report.csv"')
  async exportToCsv(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @CurrentOrg() orgId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const csvBuffer = await this.projectsService.exportToCsv(id, user.id, orgId);
    return new StreamableFile(csvBuffer);
  }

  @Post('bulk-export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export multiple projects' })
  @ApiResponse({ status: 200, description: 'Export job initiated' })
  async bulkExport(
    @Body() bulkExportDto: {
      projectIds: string[];
      format: 'pdf' | 'excel' | 'csv';
      includeStatusReports: boolean;
      includeRiskAssessments: boolean;
      includeTimelines: boolean;
    },
    @CurrentUser() user: User,
    @CurrentOrg() orgId: string,
  ) {
    return this.projectsService.bulkExport(bulkExportDto, user.id, orgId);
  }

  @Post('export-schedules')
  @ApiOperation({ summary: 'Create an export schedule' })
  @ApiResponse({ status: 201, description: 'Export schedule created' })
  async createExportSchedule(
    @Body() createScheduleDto: CreateExportScheduleDto,
    @CurrentUser() user: User,
    @CurrentOrg() orgId: string,
  ) {
    return this.projectsService.createExportSchedule(createScheduleDto, user.id, orgId);
  }

  @Get('export-schedules')
  @ApiOperation({ summary: 'Get all export schedules' })
  @ApiResponse({ status: 200, description: 'List of export schedules' })
  async getExportSchedules(
    @CurrentUser() user: User,
    @CurrentOrg() orgId: string,
  ) {
    return this.projectsService.getExportSchedules(user.id, orgId);
  }
}