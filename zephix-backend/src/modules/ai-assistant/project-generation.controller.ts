import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../organizations/guards/organization.guard';

export class GenerateProjectRequest {
  documentId: string;
  methodology: 'agile' | 'waterfall' | 'hybrid' | 'custom';
  customSettings?: {
    phases?: string[];
    teamSize?: number;
    timeline?: number; // in weeks
  };
}

export class ProjectGenerationResponse {
  projectId: string;
  status: 'generating' | 'completed' | 'failed';
  message: string;
  estimatedCompletionTime?: number; // in seconds
}

@ApiTags('AI Project Generation')
@Controller('ai/project-generation')
@UseGuards(JwtAuthGuard) // Temporarily disabled OrganizationGuard
@ApiBearerAuth()
export class ProjectGenerationController {
  constructor() {}

  @Post('generate-from-brd/:documentId')
  @ApiOperation({ summary: 'Generate a project plan from a processed BRD' })
  @ApiParam({
    name: 'documentId',
    description: 'Document ID from BRD processing',
  })
  @ApiBody({ type: GenerateProjectRequest })
  @ApiResponse({
    status: 202,
    description: 'Project generation started',
    type: ProjectGenerationResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or document not found',
  })
  async generateProjectFromBRD(
    @Param('documentId') documentId: string,
    @Body() request: GenerateProjectRequest,
    @Request() req: any,
  ): Promise<ProjectGenerationResponse> {
    // Validate that the document exists and is processed
    const organizationId = req.user.organizationId;

    // For now, return a placeholder response
    // In the next phase, this will:
    // 1. Validate the BRD data
    // 2. Generate project structure based on methodology
    // 3. Create tasks, epics, and dependencies
    // 4. Return the generated project ID

    return {
      projectId: `project-${Date.now()}`, // Placeholder
      status: 'generating',
      message:
        'Project generation started. This feature will be implemented in the next phase.',
      estimatedCompletionTime: 30, // 30 seconds placeholder
    };
  }

  @Get('generation-status/:projectId')
  @ApiOperation({ summary: 'Check the status of project generation' })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID from generation request',
  })
  @ApiResponse({
    status: 200,
    description: 'Generation status retrieved successfully',
  })
  async getProjectGenerationStatus(
    @Param('projectId') projectId: string,
  ): Promise<any> {
    // For now, return a placeholder response
    return {
      projectId,
      status: 'generating',
      progress: 50, // Placeholder
      message: 'Project generation in progress...',
      estimatedCompletionTime: 15, // 15 seconds remaining
    };
  }
}
